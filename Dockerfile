# CDP Bridge Service
# Standalone Node.js service that proxies Chrome DevTools Protocol
FROM node:18-alpine

WORKDIR /app

# Copy only package files first (leverage Docker layer caching)
COPY cdp-bridge/package*.json ./cdp-bridge/

# Install dependencies
RUN cd cdp-bridge && npm ci --only=production

# Copy application code
COPY cdp-bridge/ ./cdp-bridge/

# Set environment defaults
ENV NODE_ENV=production
ENV CHROME_HOST=localhost
ENV CHROME_PORT=9222
ENV BRIDGE_PORT=3001

# Expose bridge port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start bridge service
WORKDIR /app/cdp-bridge
CMD ["node", "server.js"]
