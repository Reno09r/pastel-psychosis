# ─── Frontend: Vite + TanStack Start + Bun ───

# --- Stage 1: Install dependencies ---
FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# --- Stage 2: Build ---
FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove backend & docker dirs — not needed for the frontend build
RUN rm -rf backend docker .venv .git

RUN bun run build

# --- Stage 3: Production runtime ---
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Copy built output and server dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000

# TanStack Start / Vinxi output is a Node-compatible server
CMD ["bun", "run", "dist/server/index.js"]
