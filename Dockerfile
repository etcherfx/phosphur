# syntax=docker/dockerfile:1

# Install everything and build the static site (vendor + astro build).
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime: only the server and its two dependencies (sirv, wisp-js).
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV PORT=8080 \
    HOST=0.0.0.0
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production && rm -rf /root/.bun/install/cache
COPY server ./server
COPY --from=build /app/dist ./dist
USER bun
EXPOSE 8080
CMD ["bun", "server/index.ts"]
