#!/bin/sh
set -e

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
