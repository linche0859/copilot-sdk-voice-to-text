#!/bin/sh
set -e

# If a GitHub PAT is provided in `GITHUB_PAT_TOKEN`, map it to `GH_TOKEN` so
# other tools or scripts can read it; also map `GH_TOKEN` to `COPILOT_TOKEN`
# to support the Copilot CLI's non-interactive login helper.

# Map runtime `GITHUB_PAT_TOKEN` -> `GH_TOKEN` when not already set
if [ -n "$GITHUB_PAT_TOKEN" ] && [ -z "$GH_TOKEN" ]; then
  echo "Exporting GITHUB_PAT_TOKEN to GH_TOKEN"
  export GH_TOKEN="$GITHUB_PAT_TOKEN"
fi

# Map `GH_TOKEN` -> `COPILOT_TOKEN` for the Copilot CLI login helper
if [ -n "$GH_TOKEN" ] && [ -z "$COPILOT_TOKEN" ]; then
  echo "Setting COPILOT_TOKEN from GH_TOKEN for Copilot CLI"
  export COPILOT_TOKEN="$GH_TOKEN"
fi

# Best-effort Copilot CLI login helper.
# If COPILOT_TOKEN is provided it will attempt a non-interactive login.
# If COPILOT_CLI_URL is provided, it will be left in the environment for the SDK to use.

if [ -n "$COPILOT_TOKEN" ]; then
  echo "Attempting Copilot CLI login using COPILOT_TOKEN (non-interactive, best-effort)..."
  if command -v copilot >/dev/null 2>&1; then
    # Try a token-based login; if the CLI doesn't support the flag this will fail harmlessly
    if copilot login --token "$COPILOT_TOKEN" 2>/dev/null; then
      echo "Copilot CLI logged in via token."
    else
      echo "Warning: non-interactive token login failed. You may need to run 'copilot login' manually."
    fi
  else
    echo "Warning: copilot binary not found. Skipping login step."
  fi
fi

if [ -n "$COPILOT_CLI_URL" ]; then
  echo "Using remote Copilot CLI URL: $COPILOT_CLI_URL"
  export COPILOT_CLI_URL="$COPILOT_CLI_URL"
fi

exec "$@"
