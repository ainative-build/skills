#!/usr/bin/env python3
"""Tests for chrome-profile CLI bridge-detection + precheck logic.

Run: python3 scripts/test_chrome_profile.py

These tests exercise pure-Python functions that don't touch the real Chrome:
- detect_bridge_state(cdp_probe_fn, port_listener_fn, mcp_config_fn) -> BridgeState
- format_bridge_report(state, json_mode) -> str
- cmd_open precheck guard (refuses without bridge unless --force)

Subprocess + http probes are dependency-injected so tests stay hermetic.
"""

from __future__ import annotations

import io
import json
import sys
import unittest
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import chrome_profile_cli as cpc  # noqa: E402


# ---------------------------------------------------------------------------
# Bridge-state detection
# ---------------------------------------------------------------------------

class TestBridgeDetection(unittest.TestCase):
    def test_real_cdp_endpoint_yields_attached_bridge(self):
        state = cpc.detect_bridge_state(
            cdp_probe_fn=lambda port: {"Browser": "Chrome/131.0", "webSocketDebuggerUrl": "ws://..."},
            port_listener_fn=lambda port: {"listening": True, "command": "Google Chrome", "pid": 1943},
            mcp_config_fn=lambda: {"chrome_devtools_browser_url": "http://127.0.0.1:9222"},
            extension_probe_fn=lambda: "unknown",
        )
        self.assertEqual(state["bridge"], "chrome_devtools_mcp_attached")
        self.assertTrue(state["ok"])

    def test_squatter_detected_when_port_held_but_non_cdp_response(self):
        # The kai scenario: :9222 is bound by something Chrome-ish that returns 404 to /json/version
        state = cpc.detect_bridge_state(
            cdp_probe_fn=lambda port: None,  # /json/version returns non-200
            port_listener_fn=lambda port: {"listening": True, "command": "Google Chrome", "pid": 1943},
            mcp_config_fn=lambda: {"chrome_devtools_browser_url": None},
            extension_probe_fn=lambda: "likely",  # squatter on :9222 from inside Chrome is a strong signal
        )
        self.assertTrue(state["cdp_endpoint"]["non_cdp_squatter"])
        # Squatter detection alone is not enough; the agent session also needs MCP config.
        self.assertEqual(state["bridge"], "claude_in_chrome_likely_without_mcp_config")
        self.assertFalse(state["ok"])

    def test_squatter_with_claude_in_chrome_config_yields_bridge(self):
        state = cpc.detect_bridge_state(
            cdp_probe_fn=lambda port: None,
            port_listener_fn=lambda port: {"listening": True, "command": "Google Chrome", "pid": 1943},
            mcp_config_fn=lambda: {
                "chrome_devtools_browser_url": None,
                "claude_in_chrome_configured": True,
            },
            extension_probe_fn=lambda: "likely",
        )
        self.assertEqual(state["bridge"], "claude_in_chrome")
        self.assertTrue(state["ok"])

    def test_wrong_browser_url_port_does_not_pass_with_default_cdp(self):
        state = cpc.detect_bridge_state(
            cdp_probe_fn=lambda port: {"Browser": "Chrome/131.0", "webSocketDebuggerUrl": "ws://..."} if port == 9222 else None,
            port_listener_fn=lambda port: {"listening": True, "command": "Google Chrome", "pid": 1943},
            mcp_config_fn=lambda: {"chrome_devtools_browser_url": "http://127.0.0.1:9333"},
            extension_probe_fn=lambda: "unknown",
        )
        self.assertEqual(state["bridge"], "chrome_devtools_mcp_unreachable")
        self.assertFalse(state["ok"])

    def test_auto_connect_config_is_probe_required_not_no_bridge(self):
        state = cpc.detect_bridge_state(
            cdp_probe_fn=lambda port: None,
            port_listener_fn=lambda port: {"listening": False, "command": None, "pid": None},
            mcp_config_fn=lambda: {
                "path": "/tmp/.codex/config.toml",
                "chrome_devtools_configured": True,
                "chrome_devtools_browser_url": None,
                "chrome_devtools_auto_connect": True,
                "chrome_devtools_runtime_managed": True,
            },
            extension_probe_fn=lambda: "unknown",
        )
        self.assertEqual(state["bridge"], "chrome_devtools_mcp_auto_connect")
        self.assertTrue(state["ok"])
        self.assertTrue(state["runtime_probe_required"])
        self.assertTrue(state["chrome_devtools_mcp"]["configured"])
        self.assertTrue(state["chrome_devtools_mcp"]["auto_connect"])

    def test_codex_toml_auto_connect_config_is_detected(self):
        summary = cpc._codex_chrome_devtools_summary_from_toml("""
[mcp_servers.chrome-devtools]
command = "npx"
args = ["-y", "chrome-devtools-mcp@latest", "--autoConnect", "--channel=stable"]
enabled = true
""")

        self.assertTrue(summary["configured"])
        self.assertTrue(summary["auto_connect"])
        self.assertTrue(summary["runtime_managed"])
        self.assertIsNone(summary["browser_url"])

    def test_no_bridge_when_isolated_mcp_and_no_extension(self):
        state = cpc.detect_bridge_state(
            cdp_probe_fn=lambda port: None,
            port_listener_fn=lambda port: {"listening": False, "command": None, "pid": None},
            mcp_config_fn=lambda: {"chrome_devtools_browser_url": None},
            extension_probe_fn=lambda: "no",
        )
        self.assertEqual(state["bridge"], "none")
        self.assertFalse(state["ok"])
        self.assertTrue(len(state["remediation"]) >= 1)

    def test_json_output_is_valid_json(self):
        state = cpc.detect_bridge_state(
            cdp_probe_fn=lambda port: None,
            port_listener_fn=lambda port: {"listening": False, "command": None, "pid": None},
            mcp_config_fn=lambda: {"chrome_devtools_browser_url": None},
            extension_probe_fn=lambda: "no",
        )
        out = cpc.format_bridge_report(state, json_mode=True)
        parsed = json.loads(out)
        self.assertIn("bridge", parsed)
        self.assertIn("ok", parsed)
        self.assertIn("remediation", parsed)


# ---------------------------------------------------------------------------
# Precheck guard in cmd_open
# ---------------------------------------------------------------------------

class FakeArgs:
    def __init__(
        self,
        key="personal",
        url="https://example.com",
        force=False,
        json=False,
        no_activate=False,
        show_emails=False,
    ):
        self.key = key
        self.url = url
        self.force = force
        self.json = json
        self.no_activate = no_activate
        self.show_emails = show_emails


class TestOpenPrecheck(unittest.TestCase):
    """The default `chrome-profile <key> <url>` MUST refuse if no bridge AND no --force."""

    def _mock_no_bridge(self):
        return {
            "ok": False,
            "bridge": "none",
            "remediation": ["configure chrome-devtools-mcp --autoConnect", "or use --browserUrl"],
            "cdp_endpoint": {"non_cdp_squatter": False},
        }

    def _mock_with_bridge(self):
        return {
            "ok": True,
            "bridge": "chrome_devtools_mcp_attached",
            "remediation": [],
            "cdp_endpoint": {"non_cdp_squatter": False},
        }

    def test_open_refuses_without_bridge_when_no_force(self):
        args = FakeArgs(force=False)
        buf_err = io.StringIO()
        with patch.object(cpc, "detect_bridge_state_default", return_value=self._mock_no_bridge()), \
             patch.object(cpc, "_launch_chrome_tab") as launch, \
             redirect_stderr(buf_err):
            with self.assertRaises(SystemExit) as ctx:
                cpc.cmd_open(args)
        self.assertNotEqual(ctx.exception.code, 0)
        launch.assert_not_called()
        self.assertIn("bridge", buf_err.getvalue().lower())
        self.assertIn("--force", buf_err.getvalue())

    def test_open_bypasses_precheck_with_force(self):
        args = FakeArgs(force=True)
        with patch.object(cpc, "detect_bridge_state_default", return_value=self._mock_no_bridge()), \
             patch.object(cpc, "_launch_chrome_tab", return_value=("Default", {"user_name": "x@y"})) as launch, \
             redirect_stdout(io.StringIO()):
            cpc.cmd_open(args)  # must not raise
        launch.assert_called_once()

    def test_open_proceeds_when_bridge_detected(self):
        args = FakeArgs(force=False)
        with patch.object(cpc, "detect_bridge_state_default", return_value=self._mock_with_bridge()), \
             patch.object(cpc, "_launch_chrome_tab", return_value=("Default", {"user_name": "x@y"})) as launch, \
             redirect_stdout(io.StringIO()):
            cpc.cmd_open(args)
        launch.assert_called_once()

    def test_open_proceeds_when_runtime_probe_is_required(self):
        args = FakeArgs(force=False)
        state = {
            "ok": True,
            "bridge": "chrome_devtools_mcp_auto_connect",
            "runtime_probe_required": True,
            "remediation": [],
            "cdp_endpoint": {"non_cdp_squatter": False},
        }
        with patch.object(cpc, "detect_bridge_state_default", return_value=state), \
             patch.object(cpc, "_launch_chrome_tab", return_value=("Default", {"user_name": "x@y"})) as launch, \
             redirect_stdout(io.StringIO()):
            cpc.cmd_open(args)
        launch.assert_called_once()

    def test_validate_url_rejects_chrome_arg_injection(self):
        with self.assertRaises(SystemExit):
            cpc.validate_url("--user-data-dir=/tmp/evil")

    def test_redact_email_hides_local_part_by_default(self):
        self.assertEqual(cpc.redact_email("person@example.com"), "p***@example.com")


# ---------------------------------------------------------------------------
# Exact tab binding for profile-scoped opens
# ---------------------------------------------------------------------------

class TestOpenBinding(unittest.TestCase):
    def _profile_mocks(self):
        return (
            patch.object(cpc, "load_config", return_value=({"profiles": {"work": {"email": "work@example.com"}}}, Path("/tmp/profiles.json"))),
            patch.object(cpc, "info_cache", return_value={"Profile 7": {"user_name": "work@example.com", "name": "Work"}}),
            patch.object(cpc, "chrome_binary", return_value="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            patch.object(cpc.subprocess, "Popen"),
        )

    def test_open_anchor_preserves_profile_marker(self):
        opened = cpc.add_profile_anchor("https://example.com", "work")

        self.assertIn("#cdp-profile=work", opened)

    def test_open_anchor_can_include_exact_open_marker(self):
        opened = cpc.add_profile_anchor("https://example.com", "work", open_id="run-1")

        self.assertIn("#cdp-profile=work", opened)
        self.assertIn("&cdp-open=run-1", opened)

    def test_new_open_id_is_unique(self):
        self.assertNotEqual(cpc._new_open_id(), cpc._new_open_id())

    def test_ambiguous_profile_resolution_fails_closed(self):
        cache = {
            "Profile 1": {"name": "Work", "user_name": "one@example.com"},
            "Profile 2": {"name": "Work Backup", "user_name": "two@example.com"},
        }

        with self.assertRaises(SystemExit) as ctx:
            cpc.resolve_profile_dir("work", {"name_contains": "Work"}, cache)

        self.assertIn("matches multiple profiles", str(ctx.exception))

    def test_human_open_output_prefers_exact_open_marker(self):
        args = FakeArgs(key="work", url="https://example.com/app", force=True)
        load_config, info_cache, chrome_binary, popen = self._profile_mocks()
        buf = io.StringIO()

        with load_config, info_cache, chrome_binary, popen as popen_mock, \
             patch.object(cpc, "_new_open_id", return_value="open-fixed", create=True), \
             redirect_stdout(buf):
            cpc.cmd_open(args)

        out = buf.getvalue()
        self.assertIn("cdp-profile=work", out)
        self.assertIn("cdp-open=open-fixed", out)
        self.assertIn("find:   list_pages -> tab whose url contains 'cdp-open=open-fixed'", out)
        opened_url = popen_mock.call_args.args[0][-1]
        self.assertIn("cdp-open=open-fixed", opened_url)

    def test_json_open_outputs_machine_readable_binding(self):
        args = FakeArgs(key="work", url="https://example.com/app", force=True, json=True)
        load_config, info_cache, chrome_binary, popen = self._profile_mocks()
        buf = io.StringIO()

        with load_config, info_cache, chrome_binary, popen as popen_mock, \
             patch.object(cpc, "_new_open_id", return_value="open-fixed", create=True), \
             redirect_stdout(buf):
            cpc.cmd_open(args)

        payload = json.loads(buf.getvalue())
        self.assertEqual(payload["profile_key"], "work")
        self.assertEqual(payload["profile_dir"], "Profile 7")
        self.assertEqual(payload["profile_marker"], "cdp-profile=work")
        self.assertEqual(payload["open_marker"], "cdp-open=open-fixed")
        self.assertEqual(payload["bind_selector"], "cdp-open=open-fixed")
        self.assertEqual(payload["profile_label"], "w***@example.com")
        self.assertIn("cdp-profile=work", payload["opened_url"])
        self.assertIn("cdp-open=open-fixed", payload["opened_url"])
        self.assertIn("cdp-open=open-fixed", popen_mock.call_args.args[0][-1])

    def test_no_activate_flag_restores_previous_macos_app(self):
        args = FakeArgs(key="work", url="https://example.com/app", force=True, no_activate=True)
        load_config, info_cache, chrome_binary, popen = self._profile_mocks()

        with load_config, info_cache, chrome_binary, popen, \
             patch.object(cpc, "_new_open_id", return_value="open-fixed", create=True), \
             patch.object(cpc.platform, "system", return_value="Darwin"), \
             patch.object(cpc, "_macos_frontmost_bundle_id", return_value="com.apple.Terminal", create=True) as frontmost, \
             patch.object(cpc, "_macos_reactivate", create=True) as reactivate, \
             redirect_stdout(io.StringIO()):
            cpc.cmd_open(args)

        frontmost.assert_called_once()
        reactivate.assert_called_once_with("com.apple.Terminal")

    def test_no_activate_env_restores_previous_macos_app(self):
        args = FakeArgs(key="work", url="https://example.com/app", force=True, no_activate=False)
        load_config, info_cache, chrome_binary, popen = self._profile_mocks()

        with load_config, info_cache, chrome_binary, popen, \
             patch.object(cpc, "_new_open_id", return_value="open-fixed", create=True), \
             patch.object(cpc.platform, "system", return_value="Darwin"), \
             patch.dict(cpc.os.environ, {"CHROME_PROFILE_NO_ACTIVATE": "1"}), \
             patch.object(cpc, "_macos_frontmost_bundle_id", return_value="com.apple.Terminal", create=True) as frontmost, \
             patch.object(cpc, "_macos_reactivate", create=True) as reactivate, \
             redirect_stdout(io.StringIO()):
            cpc.cmd_open(args)

        frontmost.assert_called_once()
        reactivate.assert_called_once_with("com.apple.Terminal")

    def test_default_open_does_not_restore_previous_macos_app(self):
        args = FakeArgs(key="work", url="https://example.com/app", force=True, no_activate=False)
        load_config, info_cache, chrome_binary, popen = self._profile_mocks()

        with load_config, info_cache, chrome_binary, popen, \
             patch.object(cpc, "_new_open_id", return_value="open-fixed", create=True), \
             patch.object(cpc.platform, "system", return_value="Darwin"), \
             patch.object(cpc, "_macos_frontmost_bundle_id", return_value="com.apple.Terminal", create=True) as frontmost, \
             patch.object(cpc, "_macos_reactivate", create=True) as reactivate, \
             redirect_stdout(io.StringIO()):
            cpc.cmd_open(args)

        frontmost.assert_not_called()
        reactivate.assert_not_called()

    def test_no_activate_is_noop_off_macos(self):
        args = FakeArgs(key="work", url="https://example.com/app", force=True, no_activate=True)
        load_config, info_cache, chrome_binary, popen = self._profile_mocks()

        with load_config, info_cache, chrome_binary, popen, \
             patch.object(cpc, "_new_open_id", return_value="open-fixed", create=True), \
             patch.object(cpc.platform, "system", return_value="Linux"), \
             patch.object(cpc, "_macos_frontmost_bundle_id", create=True) as frontmost, \
             patch.object(cpc, "_macos_reactivate", create=True) as reactivate, \
             redirect_stdout(io.StringIO()):
            cpc.cmd_open(args)

        frontmost.assert_not_called()
        reactivate.assert_not_called()


# ---------------------------------------------------------------------------
# Backward compatibility — existing surface preserved
# ---------------------------------------------------------------------------

class TestBackwardCompat(unittest.TestCase):
    def test_existing_helpers_still_importable(self):
        for name in ("cmd_list", "cmd_open", "cmd_setup", "cmd_discover",
                     "resolve_profile_dir", "info_cache", "load_config",
                     "chrome_binary", "chrome_user_data_dir"):
            self.assertTrue(hasattr(cpc, name), f"missing: {name}")

    def test_main_dispatches_open_when_two_positional_args(self):
        # `chrome-profile <key> <url>` (no subcommand) still routes to cmd_open
        with patch.object(cpc, "cmd_open") as fn:
            try:
                cpc.main(["personal", "https://example.com"])
            except SystemExit:
                pass
        fn.assert_called_once()

    def test_doctor_subcommand_registered(self):
        with patch.object(cpc, "cmd_doctor") as fn:
            try:
                cpc.main(["doctor"])
            except SystemExit:
                pass
        fn.assert_called_once()


if __name__ == "__main__":
    unittest.main(verbosity=2)
