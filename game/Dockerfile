# syntax=docker/dockerfile:1
# Build context: repo root (docker build -f game/Dockerfile .)

FROM node:20-alpine AS deps
WORKDIR /app
COPY shared/ ./shared/
COPY game/package.json game/package-lock.json ./game/
RUN cd game && npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/game/node_modules ./game/node_modules
COPY shared/ ./shared/
COPY game/ ./game/
# Copy repo root to staging so shell can handle folder names with spaces.
# (game/public/assets is a symlink to ../../ which causes infinite recursion in Vite)
COPY . /tmp/repo/
RUN rm -f game/public/assets && mkdir -p game/public/assets && \
    cp -r \
      "/tmp/repo/Buildings" \
      "/tmp/repo/Particle FX" \
      "/tmp/repo/Terrain" \
      "/tmp/repo/UI Elements" \
      "/tmp/repo/Units" \
      game/public/assets/ && \
    rm -rf /tmp/repo
# VITE_SERVER_URL is baked into the bundle at build time
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN cd game && npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/game/dist /usr/share/nginx/html
COPY game/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
