# Hook Response Protocol

Use this file when a tool call is blocked by an aif hook.

## Privacy Block Hook (`@@PRIVACY_PROMPT@@`)

When the privacy-block hook stops a tool call on a sensitive file (dotenv files,
keys, credentials), its output contains a JSON payload between
`@@PRIVACY_PROMPT_START@@` and `@@PRIVACY_PROMPT_END@@`.

**Required flow:**

1. Parse the JSON. Its `question` field holds the header, text and options to show.
2. Ask the user with that question through the runtime's ask-user capability
   (`AskUserQuestion` on Claude Code). Do not reword it or add options.
3. Based on the user's selection:
   - **"Yes, approve once"**: retry the same tool call once, unchanged except that
     each protected path is prefixed with `APPROVED:`. The hook consumes the
     one-time grant and strips the prefix before the tool runs. The grant covers
     one access of those paths in this session and expires after 15 minutes.
   - **"No, skip this file"**: continue without the file.
4. If the user declines or cannot answer (for example a non-interactive run),
   continue without the file.

Never reach a blocked file through another tool or command, and never add the
`APPROVED:` prefix without the user's explicit approval in this session.
