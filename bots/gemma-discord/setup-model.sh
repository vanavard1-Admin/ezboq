#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-model.sh — Build & test gemma4-ezboq custom Ollama model
# Run from: /Users/l168/Documents/ใบเสนอราคา/bots/gemma-discord/
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

MODEL_NAME="gemma4-ezboq"
MODELFILE="./Modelfile"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"

# ─── Colors ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[gemma-setup]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }

# ─── Pre-flight checks ───────────────────────────────────────────────────────
log "Checking prerequisites..."

command -v ollama >/dev/null 2>&1 || fail "ollama not found. Install from https://ollama.com"

if ! curl -sf "${OLLAMA_URL}/api/tags" >/dev/null 2>&1; then
  fail "Ollama is not running at ${OLLAMA_URL}. Run: ollama serve"
fi

[[ -f "$MODELFILE" ]] || fail "Modelfile not found at: $MODELFILE"

# Check base model exists
if ! ollama list 2>/dev/null | grep -q "gemma4"; then
  warn "Base model 'gemma4:latest' not found locally."
  log "Pulling gemma4:latest (this may take a while)..."
  ollama pull gemma4:latest || fail "Failed to pull gemma4:latest"
fi

ok "Prerequisites OK"

# ─── Build model ─────────────────────────────────────────────────────────────
log "Building ${MODEL_NAME} from Modelfile..."
ollama create "${MODEL_NAME}" -f "${MODELFILE}"
ok "Model '${MODEL_NAME}' created successfully"

# ─── Model info ──────────────────────────────────────────────────────────────
echo ""
log "Model info:"
ollama show "${MODEL_NAME}"

# ─── Test prompts ────────────────────────────────────────────────────────────
echo ""
log "Running test prompts..."

# Test 1: Thai greeting + identity
echo -e "${YELLOW}--- Test 1: Identity ---${NC}"
ollama run "${MODEL_NAME}" "สวัสดี คุณคือใคร มีความสามารถอะไรบ้าง?" --nowordwrap 2>/dev/null || \
  warn "Test 1 failed (non-fatal)"

echo ""

# Test 2: BOQ calculation
echo -e "${YELLOW}--- Test 2: BOQ Calculation ---${NC}"
ollama run "${MODEL_NAME}" "ประเมินราคาตกแต่งภายในห้อง 30 ตร.ม. สไตล์ Japanese tier standard รวม VAT" --nowordwrap 2>/dev/null || \
  warn "Test 2 failed (non-fatal)"

echo ""

# Test 3: Sales content
echo -e "${YELLOW}--- Test 3: Sales Caption ---${NC}"
ollama run "${MODEL_NAME}" "เขียน hook caption ขายซอฟต์แวร์ EzBOQ สำหรับ Facebook สั้นๆ 2-3 บรรทัด" --nowordwrap 2>/dev/null || \
  warn "Test 3 failed (non-fatal)"

echo ""

# ─── List updated models ─────────────────────────────────────────────────────
log "All available models:"
ollama list

echo ""
ok "Setup complete! Model '${MODEL_NAME}' is ready."
log "To use in bot: set GEMMA_MODEL=${MODEL_NAME} in your .env"
log "To chat directly: ollama run ${MODEL_NAME}"
