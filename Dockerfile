# == Stage 1: Build ==
FROM node:26-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx webpack build --no-watch --config webpack.config.cjs


# == Stage 2: Run ==
FROM debian:trixie-slim

WORKDIR /app

RUN apt update && apt install -y --no-install-recommends nodejs npm imagemagick && rm -rf /var/lib/apt/lists/*

RUN useradd appuser && \
    mkdir /uploads && \
    chown appuser:appuser /uploads && \
    mkdir /data && \
    chown appuser:appuser /data

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .
COPY --from=build /app/public/dist ./public/dist

RUN chown -R appuser:appuser /app/views/partials/generated

USER appuser

ENV PORT=3000
ENV DATABASE_DIR=/data
ENV UPLOADS_DIR=/uploads

EXPOSE ${PORT}

CMD ["node", "index.js"]

