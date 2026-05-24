# ─── Backend: FastAPI + Python 3.12 + uv ───
FROM python:3.12-slim AS base

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy dependency files first (for layer caching)
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev deps in prod)
RUN uv sync --frozen --no-dev --no-install-project

# Copy backend source code
COPY backend/ ./backend/

# Ensure data & upload directories exist
RUN mkdir -p /app/backend/data /app/backend/data/uploads

# Expose FastAPI port
EXPOSE 8000

# Run from backend/app so relative imports in db.py resolve correctly
WORKDIR /app/backend/app

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
