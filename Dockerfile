FROM node:18-bullseye-slim

# Set production environment by default
ENV NODE_ENV=production
WORKDIR /app

# Install npm dependencies (production only) early to leverage layer caching
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy app source (includes docker-entrypoint.sh, server/, public/, etc.)
COPY . .

# Install Copilot CLI globally via npm (optional, falls back to remote CLI if fails)
# Note: If this fails, the app can still work with COPILOT_CLI_URL pointing to remote CLI
RUN npm install -g @github/copilot-cli 2>/dev/null || echo "⚠️  Copilot CLI installation skipped - will use remote CLI or SDK fallback"

# Make entrypoint script executable (it's in the current directory after COPY . .)
RUN chmod +x docker-entrypoint.sh

# Expose default port; Zeabur will provide PORT env when deploying
EXPOSE 3000
ENV PORT=3000

# The entrypoint script will handle GitHub authentication by mapping
# GITHUB_PAT_TOKEN to GH_TOKEN at runtime
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
