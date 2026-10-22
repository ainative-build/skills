# GitHub API compatibility helpers for the aif-git merge-pr workflow.
#
# Source this file from every PR bash block:
#
#   . "<aif-git>/scripts/gh-api-helpers.sh"
#
# where <aif-git> is the installed aif-git skill directory.
#
# Falls the skill back to REST when the GitHub GraphQL API is blocked at the
# proxy (e.g. Claude Cloud Environment). Read commands honour AIF_GH_REST;
# write commands try native `gh pr …` first and fall back to REST via
# `gh api repos/{o}/{r}/…` on a GraphQL-not-enabled error or when the probe
# already reported `AIF_GH_REST=1`.

# Detect GraphQL availability. Sets AIF_GH_REST=1 when GraphQL is blocked.
# Idempotent — safe to call many times per run.
_aif_probe_gh_api() {
  if [ -n "${AIF_GH_REST_PROBED:-}" ]; then
    return 0
  fi
  AIF_GH_REST=0
  if ! gh api graphql -f query='{__typename}' >/dev/null 2>&1; then
    AIF_GH_REST=1
  fi
  AIF_GH_REST_PROBED=1
  export AIF_GH_REST AIF_GH_REST_PROBED
}

# Parse a PR ref into "owner repo number".
# Accepts: 123 | #123 | https://github.com/OWNER/REPO/pull/123
_aif_split_pr() {
  local ref="${1#\#}"
  if [[ "$ref" =~ ^https?://github\.com/([^/]+)/([^/]+)/pull/([0-9]+) ]]; then
    printf '%s %s %s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}"
    return 0
  fi
  # Resolve OWNER/REPO from the git remote URL (no API call, works even when
  # GraphQL is blocked and `gh repo view` fails). `|| true` shields callers
  # running under `set -e` when the named remote is absent.
  local url
  url="$(git remote get-url upstream 2>/dev/null || true)"
  [ -n "$url" ] || url="$(git remote get-url origin 2>/dev/null || true)"
  local slug=""
  if [ -n "$url" ]; then
    # Strip trailing .git and any URL prefix (https://…/, git@…:, ssh://…/).
    slug="${url%.git}"
    slug="${slug##*github.com[/:]}"
    slug="${slug##*github.com/}"
  fi
  # Last-resort: try gh (works only when GraphQL is available).
  if [ -z "$slug" ] || [[ ! "$slug" =~ ^[^/]+/[^/]+$ ]]; then
    slug="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  fi
  # Final validation — enterprise GHE remotes and unrelated remotes can leave
  # garbage here.
  if [ -z "$slug" ] || [[ ! "$slug" =~ ^[^/]+/[^/]+$ ]]; then
    echo "aif-git: cannot resolve OWNER/REPO — pass a full PR URL or run inside a github.com-linked repo (got: '$slug')" >&2
    return 1
  fi
  printf '%s %s %s\n' "${slug%/*}" "${slug#*/}" "$ref"
}

# PR JSON metadata — mirrors `gh pr view --json …`.
_aif_pr_meta() {  # $1=owner $2=repo $3=number
  _aif_probe_gh_api
  if [ "$AIF_GH_REST" = 1 ]; then
    gh api "repos/$1/$2/pulls/$3"
  else
    gh pr view "$3" --repo "$1/$2" \
      --json number,title,body,author,state,mergeable,mergeStateStatus,reviewDecision,baseRefName,headRefName,additions,deletions,changedFiles,url,headRefOid,files
  fi
}

# Unified diff for the PR.
_aif_pr_diff() {  # $1=owner $2=repo $3=number
  _aif_probe_gh_api
  if [ "$AIF_GH_REST" = 1 ]; then
    gh api "repos/$1/$2/pulls/$3" -H "Accept: application/vnd.github.v3.diff"
  else
    gh pr diff "$3" --repo "$1/$2"
  fi
}

# Changed file list (one path per line).
_aif_pr_files() {  # $1=owner $2=repo $3=number
  _aif_probe_gh_api
  if [ "$AIF_GH_REST" = 1 ]; then
    gh api "repos/$1/$2/pulls/$3/files" --paginate --jq '.[].filename'
  else
    gh pr diff "$3" --repo "$1/$2" --name-only
  fi
}

# CI check summary. Prints `<name>\t<status>\t<conclusion>\t<url>` per run,
# or "No checks found" when there are no runs.
_aif_pr_checks() {  # $1=owner $2=repo $3=number
  _aif_probe_gh_api
  if [ "$AIF_GH_REST" = 1 ]; then
    local sha
    sha="$(gh api "repos/$1/$2/pulls/$3" --jq .head.sha 2>/dev/null)"
    [ -n "$sha" ] || { echo "No checks found"; return 0; }
    local out
    out="$(gh api "repos/$1/$2/commits/$sha/check-runs" --paginate \
      --jq '.check_runs[] | "\(.name)\t\(.status)\t\(.conclusion // "")\t\(.html_url)"' 2>/dev/null)"
    if [ -z "$out" ]; then
      echo "No checks found"
    else
      printf '%s\n' "$out"
    fi
  else
    gh pr checks "$3" --repo "$1/$2" 2>/dev/null || echo "No checks found"
  fi
}

# PR body only — for feeding into pr-body-contract.cjs.
_aif_pr_body() {  # $1=owner $2=repo $3=number
  _aif_probe_gh_api
  if [ "$AIF_GH_REST" = 1 ]; then
    gh api "repos/$1/$2/pulls/$3" --jq .body
  else
    gh pr view "$3" --repo "$1/$2" --json body -q .body
  fi
}

# Post a formal review. Reads body from stdin.
# $1=owner $2=repo $3=number $4=event (APPROVE|REQUEST_CHANGES|COMMENT)
_aif_pr_review() {
  _aif_probe_gh_api
  local body
  body="$(cat)"
  local flag
  case "$4" in
    APPROVE)         flag="--approve" ;;
    REQUEST_CHANGES) flag="--request-changes" ;;
    COMMENT)         flag="--comment" ;;
    *) echo "aif-git: invalid review event: $4" >&2; return 2 ;;
  esac
  # When the probe already reports REST-only, skip the native attempt.
  if [ "$AIF_GH_REST" = 1 ]; then
    printf '%s' "$body" | gh api "repos/$1/$2/pulls/$3/reviews" -f "event=$4" -F "body=@-"
    return $?
  fi
  local err
  if err="$(printf '%s' "$body" | gh pr review "$3" --repo "$1/$2" "$flag" --body-file - 2>&1)"; then
    printf '%s\n' "$err"
    return 0
  fi
  # Native failed — try REST once (covers proxy-side GraphQL blocks the probe
  # missed and error-message wording drift across gh versions).
  if printf '%s' "$body" | gh api "repos/$1/$2/pulls/$3/reviews" -f "event=$4" -F "body=@-" 2>/dev/null; then
    return 0
  fi
  # Surface the original native error.
  printf '%s\n' "$err" >&2
  return 1
}

# Post an issue/PR comment. Reads body from stdin.
_aif_pr_comment() {  # $1=owner $2=repo $3=number
  _aif_probe_gh_api
  local body
  body="$(cat)"
  if [ "$AIF_GH_REST" = 1 ]; then
    printf '%s' "$body" | gh api "repos/$1/$2/issues/$3/comments" -F "body=@-"
    return $?
  fi
  local err
  if err="$(printf '%s' "$body" | gh pr comment "$3" --repo "$1/$2" --body-file - 2>&1)"; then
    printf '%s\n' "$err"
    return 0
  fi
  if printf '%s' "$body" | gh api "repos/$1/$2/issues/$3/comments" -F "body=@-" 2>/dev/null; then
    return 0
  fi
  printf '%s\n' "$err" >&2
  return 1
}
