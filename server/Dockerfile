# syntax=docker/dockerfile:1
# Build context: repo root (docker build -f server/Dockerfile .)

FROM node:20-alpine AS deps
WORKDIR /app
COPY shared/ ./shared/
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY shared/ ./shared/
COPY server/src ./server/src
COPY server/tsconfig.json ./server/
COPY server/package.json ./server/
# rootDir=".." → compiled output lands in server/dist/server/src/ and server/dist/shared/src/
RUN cd server && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled server source
COPY --from=builder /app/server/dist/server/src ./src

# Create @kingdom-wars/shared as a resolvable module from compiled output
RUN mkdir -p node_modules/@kingdom-wars/shared
COPY --from=builder /app/server/dist/shared/src ./node_modules/@kingdom-wars/shared/src
RUN printf '{"name":"@kingdom-wars/shared","version":"0.1.0","main":"./src/index.js"}' \
    > node_modules/@kingdom-wars/shared/package.json

EXPOSE 2567
CMD ["node", "src/index.js"]
