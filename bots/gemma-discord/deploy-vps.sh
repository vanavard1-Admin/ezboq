#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_HOST="${GEMMA_VPS_HOST:-root@194.233.88.67}"
REMOTE_DIR="${GEMMA_VPS_DIR:-/root/projects/gemma-discord}"
SERVICE_NAME="${GEMMA_VPS_SERVICE:-gemma-discord}"

rsync -avz \
  --exclude 'node_modules' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'gemma-memory.db' \
  --exclude 'gemma-memory.db-shm' \
  --exclude 'gemma-memory.db-wal' \
  --exclude 'gemma.db' \
  --exclude 'gemma_memory.db' \
  --exclude 'generated-files' \
  --exclude 'backups' \
  --exclude 'exports' \
  --exclude 'gemma.log' \
  --exclude 'gemma-audit.log' \
  "${SCRIPT_DIR}/" \
  "${REMOTE_HOST}:${REMOTE_DIR}/"

ssh "${REMOTE_HOST}" "set -e; systemctl restart ${SERVICE_NAME}; sleep 2; systemctl show ${SERVICE_NAME} -p ActiveState -p SubState -p Result -p ExecMainStatus -p MainPID"
