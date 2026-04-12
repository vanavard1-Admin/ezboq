#!/bin/bash
# =============================================================================
# Fine-tune Gemma for Thai AI Assistant (Interior Design + Sales + Lifestyle)
# Uses Ollama Modelfile approach (local) + optional Unsloth/HuggingFace path
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRAINING_DATA="$SCRIPT_DIR/qa-pairs.jsonl"
MODEL_DIR="$SCRIPT_DIR/model"
MODELFILE="$SCRIPT_DIR/Modelfile"
BASE_MODEL="gemma3:4b"       # or gemma3:12b for better quality
FINE_TUNED_NAME="gemma-thai-assistant"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# =============================================================================
# STEP 1: Validate dependencies
# =============================================================================
check_deps() {
  log "Checking dependencies..."

  command -v ollama &>/dev/null || err "Ollama not found. Install: https://ollama.ai"
  command -v python3 &>/dev/null || err "Python3 not found."
  command -v jq &>/dev/null    || warn "jq not found — validation step will be skipped."

  log "All required dependencies found."
}

# =============================================================================
# STEP 2: Validate JSONL training data
# =============================================================================
validate_data() {
  log "Validating training data: $TRAINING_DATA"

  [[ -f "$TRAINING_DATA" ]] || err "Training data not found: $TRAINING_DATA"

  TOTAL=$(wc -l < "$TRAINING_DATA")
  log "Total Q&A pairs: $TOTAL"

  if command -v python3 &>/dev/null; then
    python3 - <<'PYEOF'
import json, sys

path = sys.argv[1] if len(sys.argv) > 1 else "qa-pairs.jsonl"
errors = 0
with open(path) as f:
    for i, line in enumerate(f, 1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            assert "messages" in obj, "missing 'messages' key"
            msgs = obj["messages"]
            assert len(msgs) >= 2, "need at least 2 messages"
            assert msgs[0]["role"] == "user", "first message must be user"
            assert msgs[-1]["role"] == "assistant", "last message must be assistant"
        except Exception as e:
            print(f"  Line {i}: {e}")
            errors += 1

if errors == 0:
    print(f"  All lines valid.")
else:
    print(f"  {errors} error(s) found.")
    sys.exit(1)
PYEOF
    python3 - "$TRAINING_DATA" 2>&1 || err "Training data validation failed."
  fi

  log "Training data validation passed."
}

# =============================================================================
# STEP 3: Convert JSONL to Ollama-compatible chat format
# =============================================================================
convert_to_modelfile_format() {
  log "Converting JSONL to Modelfile system prompt format..."

  mkdir -p "$MODEL_DIR"

  # Extract all assistant responses to build a system context summary
  python3 - "$TRAINING_DATA" "$MODEL_DIR/system_context.txt" <<'PYEOF'
import json, sys

in_path  = sys.argv[1]
out_path = sys.argv[2]

pairs = []
with open(in_path) as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        obj = json.loads(line)
        msgs = obj["messages"]
        user = next((m["content"] for m in msgs if m["role"] == "user"), "")
        asst = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
        pairs.append((user, asst))

# Write summary
with open(out_path, "w") as f:
    f.write(f"Loaded {len(pairs)} Q&A pairs for fine-tuning.\n")
    f.write("Sample topics covered:\n")
    for i, (q, _) in enumerate(pairs[:5]):
        f.write(f"  {i+1}. {q[:80]}...\n")

print(f"Converted {len(pairs)} pairs.")
PYEOF

  log "Conversion done. See $MODEL_DIR/system_context.txt"
}

# =============================================================================
# STEP 4: Create Ollama Modelfile with system prompt + few-shot examples
# =============================================================================
create_modelfile() {
  log "Creating Ollama Modelfile..."

  # Pull a few examples for the system few-shot block
  EXAMPLES=$(python3 - "$TRAINING_DATA" <<'PYEOF'
import json, sys, random

with open(sys.argv[1]) as f:
    lines = [l.strip() for l in f if l.strip()]

random.seed(42)
samples = random.sample(lines, min(6, len(lines)))

result = []
for line in samples:
    obj = json.loads(line)
    msgs = obj["messages"]
    user = next((m["content"] for m in msgs if m["role"] == "user"), "")
    asst = next((m["content"] for m in msgs if m["role"] == "assistant"), "")
    result.append(f'USER: {user[:120]}\nASSISTANT: {asst[:300]}')

print("\n\n".join(result))
PYEOF
)

  cat > "$MODELFILE" <<MODELFILEEOF
# Ollama Modelfile — Thai AI Assistant (Interior Design + Sales + Lifestyle)
# Base: $BASE_MODEL
# Generated by fine-tune.sh

FROM $BASE_MODEL

# ── Parameters ──────────────────────────────────────────────────────────────
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 4096

# ── System Prompt ────────────────────────────────────────────────────────────
SYSTEM """
คุณคือ AI Assistant ผู้ช่วยอัจฉริยะ พูดภาษาไทยปนอังกฤษ น่ารัก กระชับ มีประโยชน์

## บทบาทและความเชี่ยวชาญ
- **Interior Design:** ให้คำปรึกษาตกแต่งบ้าน รีโนเวท เปรียบเทียบวัสดุ ประเมินราคา
- **Sales & Marketing:** เขียน caption social media, strategy การขาย, affiliate marketing
- **Personal Assistant:** วางแผนตาราง, เตือนนัด, สุขภาพ, การเงิน
- **EzBOQ Platform:** ช่วยใช้งานระบบใบเสนอราคา BOQ, PO, Invoice
- **Bot Commands:** อธิบายคำสั่ง /boq /material /room /convert /remind /todo /learn /skill

## กฎการตอบ
1. ใช้ภาษาไทยเป็นหลัก ปนอังกฤษตามธรรมชาติ
2. ลงท้ายด้วย "ค่ะ" หรือ "คะ" เสมอ (เพศหญิง)
3. ใช้ emoji 1–2 ตัวต่อคำตอบ ไม่มากเกิน
4. ตอบกระชับ แต่ครบถ้วน มีข้อมูลจริง
5. คำนวณราคา/ตัวเลขให้ชัดเจนเมื่อถูกถาม
6. ใช้ Markdown formatting (bold, bullet, table) เพื่อความชัดเจน
7. ไม่แต่งข้อมูลที่ไม่มีความรู้จริง — บอกตรงๆ ว่าไม่ทราบ

## โทนเสียง
- เป็นกันเอง ไม่เป็นทางการมากเกิน
- มั่นใจ ให้คำแนะนำเชิงรุก
- แสดงความเชี่ยวชาญด้วยตัวเลขและข้อมูลจริง
"""

# ── Few-shot Examples ────────────────────────────────────────────────────────
# (injected from training data sample)

MODELFILEEOF

  log "Modelfile created: $MODELFILE"
}

# =============================================================================
# STEP 5: Build & push Ollama model
# =============================================================================
build_ollama_model() {
  log "Building Ollama model: $FINE_TUNED_NAME ..."

  ollama create "$FINE_TUNED_NAME" -f "$MODELFILE" || err "Failed to create Ollama model."

  log "Model '$FINE_TUNED_NAME' created successfully."
  log "Test with: ollama run $FINE_TUNED_NAME"
}

# =============================================================================
# STEP 6 (Optional): Full fine-tune via Unsloth + HuggingFace
#   Requires: pip install unsloth transformers datasets trl peft accelerate
#   Run on GPU machine (Colab, RunPod, local NVIDIA GPU)
# =============================================================================
full_finetune_python() {
  log "Writing Python fine-tune script (Unsloth / LoRA)..."

  cat > "$MODEL_DIR/finetune_lora.py" <<'PYEOF'
#!/usr/bin/env python3
"""
Full fine-tune script using Unsloth + LoRA for Gemma
Run on: Google Colab (T4/A100) or RunPod GPU instance

pip install unsloth transformers datasets trl peft accelerate bitsandbytes
"""

import json
import os
from datasets import Dataset
from trl import SFTTrainer, SFTConfig

# ── Config ──────────────────────────────────────────────────────────────────
BASE_MODEL   = "google/gemma-3-4b-it"   # or gemma-3-12b-it
OUTPUT_DIR   = "./gemma-thai-finetuned"
DATA_PATH    = "../qa-pairs.jsonl"
MAX_SEQ_LEN  = 2048
LORA_R       = 16
LORA_ALPHA   = 32
LORA_DROPOUT = 0.05
EPOCHS       = 3
BATCH_SIZE   = 4
LR           = 2e-4

# ── Load data ────────────────────────────────────────────────────────────────
def load_jsonl(path):
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records

def format_chat(record):
    """Convert messages list to chat template string."""
    msgs = record["messages"]
    text = ""
    for m in msgs:
        if m["role"] == "user":
            text += f"<start_of_turn>user\n{m['content']}<end_of_turn>\n"
        elif m["role"] == "assistant":
            text += f"<start_of_turn>model\n{m['content']}<end_of_turn>\n"
    return {"text": text}

records = load_jsonl(DATA_PATH)
formatted = [format_chat(r) for r in records]
dataset = Dataset.from_list(formatted)
print(f"Loaded {len(dataset)} examples.")

# ── Load model with Unsloth (4-bit quantized, 2x faster) ────────────────────
try:
    from unsloth import FastLanguageModel
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=BASE_MODEL,
        max_seq_length=MAX_SEQ_LEN,
        dtype=None,           # auto-detect
        load_in_4bit=True,
    )
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_R,
        target_modules=["q_proj","k_proj","v_proj","o_proj",
                         "gate_proj","up_proj","down_proj"],
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )
    print("Using Unsloth (fast mode)")
except ImportError:
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import get_peft_model, LoraConfig, TaskType
    import torch

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
    )
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=bnb_config,
        device_map="auto",
    )
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        target_modules=["q_proj","k_proj","v_proj","o_proj"],
        lora_dropout=LORA_DROPOUT,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )
    model = get_peft_model(model, lora_config)
    print("Using HuggingFace PEFT (standard mode)")

# ── Train ────────────────────────────────────────────────────────────────────
training_args = SFTConfig(
    output_dir=OUTPUT_DIR,
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=4,
    learning_rate=LR,
    fp16=True,
    logging_steps=10,
    save_strategy="epoch",
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    report_to="none",
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LEN,
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=training_args,
)

print("Starting training...")
trainer.train()

# ── Save ─────────────────────────────────────────────────────────────────────
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"Model saved to: {OUTPUT_DIR}")

# ── Export to GGUF for Ollama ─────────────────────────────────────────────────
print("""
Next steps to use with Ollama:
  1. Convert to GGUF:
     pip install llama-cpp-python
     python -m llama_cpp.scripts.convert_hf_to_gguf ./gemma-thai-finetuned --outfile gemma-thai.gguf

  2. Create Ollama model:
     ollama create gemma-thai-assistant -f ../Modelfile

  Or upload to HuggingFace Hub:
     huggingface-cli upload YOUR_USERNAME/gemma-thai-assistant ./gemma-thai-finetuned
""")
PYEOF

  log "Python fine-tune script written to: $MODEL_DIR/finetune_lora.py"
  log "Run on GPU: python3 $MODEL_DIR/finetune_lora.py"
}

# =============================================================================
# STEP 7: Test the model
# =============================================================================
test_model() {
  log "Testing model with sample prompt..."

  echo ""
  echo "────────────────────────────────────────────────────────────"
  echo "Test 1: Interior design question"
  echo "────────────────────────────────────────────────────────────"
  echo "อยากรีโนเวทห้องนอน 3x4 เมตร ค่าใช้จ่ายประมาณเท่าไหร่คะ" | \
    ollama run "$FINE_TUNED_NAME" 2>/dev/null || warn "Model test failed — model may not be loaded."

  echo ""
  echo "────────────────────────────────────────────────────────────"
  echo "Test 2: Sales / Marketing question"
  echo "────────────────────────────────────────────────────────────"
  echo "ช่วยเขียน caption Facebook ขายเฟอร์นิเจอร์ให้หน่อยค่ะ" | \
    ollama run "$FINE_TUNED_NAME" 2>/dev/null || warn "Model test failed."
}

# =============================================================================
# MAIN
# =============================================================================
main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║   Gemma Thai Assistant — Fine-tune Pipeline                 ║"
  echo "║   Base model : $BASE_MODEL                              ║"
  echo "║   Output     : $FINE_TUNED_NAME                   ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  case "${1:-all}" in
    check)        check_deps ;;
    validate)     check_deps && validate_data ;;
    convert)      check_deps && validate_data && convert_to_modelfile_format ;;
    modelfile)    check_deps && validate_data && convert_to_modelfile_format && create_modelfile ;;
    build)        check_deps && validate_data && convert_to_modelfile_format && create_modelfile && build_ollama_model ;;
    python)       full_finetune_python ;;
    test)         test_model ;;
    all)
      check_deps
      validate_data
      convert_to_modelfile_format
      create_modelfile
      build_ollama_model
      full_finetune_python
      log "Done! Run: ollama run $FINE_TUNED_NAME"
      ;;
    help|--help|-h)
      echo "Usage: $0 [command]"
      echo ""
      echo "Commands:"
      echo "  check       Check dependencies (ollama, python3, jq)"
      echo "  validate    Validate JSONL training data"
      echo "  convert     Convert JSONL to model-ready format"
      echo "  modelfile   Create Ollama Modelfile"
      echo "  build       Build Ollama model (runs all above steps)"
      echo "  python      Generate Python LoRA fine-tune script (GPU needed)"
      echo "  test        Test the fine-tuned model"
      echo "  all         Run everything (default)"
      echo ""
      echo "Examples:"
      echo "  $0 build          # Build Ollama model only"
      echo "  $0 python         # Generate GPU fine-tune script"
      echo "  $0 test           # Test existing model"
      ;;
    *)
      err "Unknown command: $1. Run '$0 help' for usage."
      ;;
  esac
}

main "$@"
