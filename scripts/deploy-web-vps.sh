#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="${EZBOQ_VPS_HOST:-root@194.233.88.67}"
REMOTE_DIR="${EZBOQ_VPS_WEB_DIR:-/root/projects/ezboq/apps/web/build}"
BUILD_DIR="${ROOT_DIR}/apps/web/build"

cd "${ROOT_DIR}"
npm run build:web

rsync -avz --delete \
  --exclude '.DS_Store' \
  "${BUILD_DIR}/" \
  "${REMOTE_HOST}:${REMOTE_DIR}/"

ssh "${REMOTE_HOST}" "set -e; test -f '${REMOTE_DIR}/index.html'; stat -c '%n %y' '${REMOTE_DIR}/index.html'"
