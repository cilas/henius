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
# Copy real asset folders from repo root (game/public/assets is a symlink to ../../
# which causes Vite's publicDir copy to loop infinitely in Docker)
RUN rm -f game/public/assets && mkdir -p game/public/assets
COPY Buildings/ ./game/public/assets/Buildings/
COPY "Particle FX"/ "./game/public/assets/Particle FX/"
COPY Terrain/ ./game/public/assets/Terrain/
COPY "UI Elements"/ "./game/public/assets/UI Elements/"
COPY Units/ ./game/public/assets/Units/
# VITE_SERVER_URL is baked into the bundle at build time
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN cd game && npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/game/dist /usr/share/nginx/html
COPY game/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
