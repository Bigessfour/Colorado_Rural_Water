# Multi-process backend: Node Express (public API) + Python RAG (localhost:5001).
# Three-tier Compose story: frontend | this backend | Postgres — RAG is internal.

FROM node:22-bookworm-slim AS node_deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev 2>/dev/null || npm install --omit=dev

FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=3000 \
    RAG_PORT=5001 \
    FAISS_INDEX_PATH=/data/faiss

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    supervisor \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

COPY backend/ /app/backend/
COPY --from=node_deps /app/backend/node_modules /app/backend/node_modules

RUN mkdir -p /data/faiss /var/log/supervisor

COPY backend/supervisord.conf /etc/supervisor/supervisord.conf

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]