# Angular production image with nginx SPA + /api proxy to Compose backend.

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Compose uses primeng-license.local.ts when present (gitignored on host; copied into build context).
# Fall back to empty stub so CI still builds; CSS also hides the license toast as a safety net.
RUN if [ ! -f src/environments/primeng-license.local.ts ]; then \
      cp src/environments/primeng-license.ts src/environments/primeng-license.local.ts; \
    fi
# Compose build talks to same-origin /api (nginx proxy)
RUN npm run build -- --configuration=compose

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1
