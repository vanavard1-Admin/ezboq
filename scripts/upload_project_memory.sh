#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${PROJECT_MEMORY_REPO_ROOT:-/root/projects/ezboq}"
SCRIPT_PATH="${PROJECT_MEMORY_SCRIPT_PATH:-$REPO_ROOT/scripts/ingest_project_memory.py}"
ENV_FILE="${PROJECT_MEMORY_ENV_FILE:-$REPO_ROOT/scripts/project_memory_upload.env}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

export PROJECT_MEMORY_REPO_ROOT="${PROJECT_MEMORY_REPO_ROOT:-$REPO_ROOT}"
export PROJECT_MEMORY_OUTPUT_DIR="${PROJECT_MEMORY_OUTPUT_DIR:-$REPO_ROOT/scripts/outputs}"
export GEMMA_EXPORTS_DIR="${GEMMA_EXPORTS_DIR:-/root/projects/gemma-discord/exports}"
export PROJECT_MEMORY_GCS_URI="${PROJECT_MEMORY_GCS_URI:-gs://ezdoc-v1-th.firebasestorage.app/project-memory/latest.json}"
export PAPERCLIP_API_URL="${PAPERCLIP_API_URL:-http://127.0.0.1:3100}"
export PAPERCLIP_COMPANY_ID="${PAPERCLIP_COMPANY_ID:-}"

mkdir -p "${PROJECT_MEMORY_OUTPUT_DIR}"

cd "${REPO_ROOT}"
/usr/bin/env python3 "${SCRIPT_PATH}"
