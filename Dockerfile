# Multi-stage build for FLAO API Gateway
FROM node:20-slim AS base

# Install pnpm (version 9 to match lockfile)
RUN npm install -g pnpm@9

# Install dependencies needed for building
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy all files needed for workspace (package.json files first for better caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN pnpm install

# Build stage
FROM base AS build

# Source code is already copied in base stage, just build

# Build all packages
RUN pnpm build

# Production stage
FROM node:20-slim AS production

# Install pnpm (version 9 to match lockfile)
RUN npm install -g pnpm@9

# Install runtime dependencies (for Prisma and Chrome for WhatsApp)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    wget \
    gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y \
    google-chrome-stable \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and workspace structure
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps

# Install all dependencies (Prisma CLI needed for migrations)
RUN pnpm install

# Copy built files from build stage (overwrite source with built versions)
# This includes all dist folders and Prisma schema
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api-gateway ./apps/api-gateway

# Generate Prisma client (schema is already copied from build stage)
WORKDIR /app/packages/db
RUN pnpm generate

# Set Chrome executable path for Puppeteer
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# Set working directory to API Gateway
WORKDIR /app/apps/api-gateway

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]

