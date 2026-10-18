# Production Dockerfile for BeatPulse Express Backend
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY server.js ./
COPY src/ ./src/

# Run as non-root user
USER node

EXPOSE 8080

CMD ["node", "server.js"]
