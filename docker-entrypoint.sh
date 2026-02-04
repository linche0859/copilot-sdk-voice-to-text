#!/bin/sh
set -e

echo "🚀 Starting Copilot SDK Voice-to-Text Service..."

# ============================================================================
# Environment Variable Setup
# ============================================================================
# Map GITHUB_PAT_TOKEN -> GH_TOKEN for GitHub authentication
# The GH_TOKEN will be used by both Copilot CLI and the SDK
# ============================================================================

if [ -n "$GITHUB_PAT_TOKEN" ]; then
  echo "✓ Found GITHUB_PAT_TOKEN, exporting as GH_TOKEN"
  export GH_TOKEN="$GITHUB_PAT_TOKEN"
elif [ -n "$GH_TOKEN" ]; then
  echo "✓ Using existing GH_TOKEN"
else
  echo "⚠️  Warning: No GitHub token found (GITHUB_PAT_TOKEN or GH_TOKEN)"
  echo "   Copilot authentication may fail without a valid token."
fi

# ============================================================================
# Copilot CLI Configuration
# ============================================================================

# Check if using remote CLI
if [ -n "$COPILOT_CLI_URL" ]; then
  echo "✓ Using remote Copilot CLI at: $COPILOT_CLI_URL"
  export COPILOT_CLI_URL="$COPILOT_CLI_URL"
  echo "   Skipping local CLI authentication (remote CLI will handle it)"
else
  echo "ℹ️  No COPILOT_CLI_URL set, will use local CLI if available"
  
  # Only attempt local CLI login if CLI binary exists and we have a token
  if command -v copilot >/dev/null 2>&1 && [ -n "$GH_TOKEN" ]; then
    echo "✓ Found local Copilot CLI, attempting authentication..."
    
    # Set GH_TOKEN for copilot CLI authentication
    # The CLI reads GH_TOKEN automatically for authentication
    export GH_TOKEN="$GH_TOKEN"
    
    # Verify CLI can access GitHub
    if copilot --version >/dev/null 2>&1; then
      echo "✓ Copilot CLI is ready (version: $(copilot --version 2>/dev/null || echo 'unknown'))"
    else
      echo "⚠️  Warning: Copilot CLI found but may not be properly configured"
    fi
  else
    if [ -z "$GH_TOKEN" ]; then
      echo "⚠️  Warning: No GitHub token available for authentication"
    else
      echo "⚠️  Warning: Copilot CLI binary not found in PATH"
    fi
    echo "   Application will attempt to connect using environment variables only"
  fi
fi

# ============================================================================
# Display Configuration Summary
# ============================================================================
echo ""
echo "Configuration Summary:"
echo "  - PORT: ${PORT:-3000}"
echo "  - NODE_ENV: ${NODE_ENV:-production}"
echo "  - GH_TOKEN: $([ -n "$GH_TOKEN" ] && echo '***set***' || echo 'not set')"
echo "  - COPILOT_CLI_URL: ${COPILOT_CLI_URL:-'not set (using local CLI)'}"
echo ""

# ============================================================================
# Start Application
# ============================================================================
echo "Starting application..."
exec "$@"
