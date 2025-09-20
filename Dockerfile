# syntax=docker/dockerfile:1

# Use Bun's official Alpine image
ARG BUN_VERSION=1.2.19-alpine
FROM oven/bun:${BUN_VERSION} AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and non-root user
WORKDIR /app
RUN addgroup -g 1001 -S bunjs && \
    adduser -S speedball -u 1001

# Copy package files for dependency installation
COPY package*.json bun.lockb* ./

# Install dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the TypeScript application
RUN bun run build

# Remove devDependencies for production (Bun handles this efficiently)
RUN bun install --frozen-lockfile --production

# Change ownership of the app directory to the speedball user
RUN chown -R speedball:bunjs /app
USER speedball

# Expose the port your app runs on
EXPOSE 2000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "require('http').get('http://localhost:2000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use the start script which includes database migration
CMD ["bun", "run", "start"]