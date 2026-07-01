# QA Workbench — Node.js app image.
# Separate image from the ML service (ml/Dockerfile); composed together via
# docker-compose.yml but built and deployed independently.
FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

# Install dependencies first for better layer caching. Uses the lockfile so
# builds are reproducible (npm ci fails if package-lock is out of sync).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Application code.
COPY src ./src
COPY public ./public

# History + uploads live here at runtime (mount a volume to persist history).
RUN mkdir -p data/history data/uploads

EXPOSE 3847

# Liveness check against the app's health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3847/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/server.js"]
