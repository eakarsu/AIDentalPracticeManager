#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
test -f "$root/.env" || { echo 'Missing .env; copy .env.example and set secrets.' >&2; exit 1; }
test -d "$root/backend/node_modules" -a -d "$root/frontend/node_modules" || { echo 'Dependencies absent; run scripts/bootstrap.sh.' >&2; exit 1; }
for port in "${BACKEND_PORT:-3001}" "${FRONTEND_PORT:-3000}"; do ! lsof -ti ":$port" >/dev/null 2>&1 || { echo "Port $port is already in use; refusing to terminate it." >&2; exit 1; }; done
(cd "$root/backend" && npm start) & backend_pid=$!
(cd "$root/frontend" && BROWSER=none PORT="${FRONTEND_PORT:-3000}" npm start) & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
