FROM node:18-bullseye-slim

# Set production environment by default
ENV NODE_ENV=production
WORKDIR /app

# Install system dependencies needed to download and extract Copilot CLI
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates tar gzip \
  && rm -rf /var/lib/apt/lists/*

# Install npm dependencies (production only) early to leverage layer caching
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Install Copilot CLI (linux x64 binary). This uses the GitHub Releases "latest" download
# URL. If you target a different platform/arch replace the URL accordingly.
RUN COPILOT_URL="https://github.com/github/copilot-cli/releases/latest/download/copilot-linux-x64.tar.gz" \
  && echo "Downloading Copilot CLI from: $COPILOT_URL" \
  && curl -fsSL "$COPILOT_URL" -o /tmp/copilot.tar.gz \
  && tar -xzf /tmp/copilot.tar.gz -C /tmp \
  && mv /tmp/copilot /usr/local/bin/ \
  && chmod +x /usr/local/bin/copilot \
  && rm -f /tmp/copilot.tar.gz || echo "Warning: Copilot CLI install step failed - check URL or platform"

# Copy entrypoint helper which will attempt a best-effort non-interactive login
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose default port; Zeabur will provide PORT env when deploying
EXPOSE 3000
ENV PORT=3000

# Allow runtime mapping of a provided GitHub PAT to `GH_TOKEN` via the entrypoint
ENV GH_TOKEN=""

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]
