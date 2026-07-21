#!/usr/bin/env bash
set -euo pipefail
test "${CONFIRM_DEMO_SEED:-}" = YES || { echo 'Set CONFIRM_DEMO_SEED=YES; never run against production.' >&2; exit 1; }
test "${NODE_ENV:-development}" != production || { echo 'Demo seed is disabled in production.' >&2; exit 1; }
cd "$(dirname "$0")/../backend"; node db/seed.js
