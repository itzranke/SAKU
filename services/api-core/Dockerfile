# Production Dockerfile for SAKU NestJS API Core
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.1.0

# Copy root monorepo files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY services/api-core ./services/api-core
COPY packages/ledger-core ./packages/ledger-core
COPY packages/database ./packages/database

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN pnpm --filter @saku/database exec prisma generate

# Build API Core
RUN pnpm --filter @saku/api-core build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/api-core/dist ./dist
COPY --from=builder /app/services/api-core/package.json ./package.json

EXPOSE 4000

CMD ["node", "dist/main.js"]
