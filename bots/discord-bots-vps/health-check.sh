#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${DISCORD_BOTS_HEALTH_ENV:-/etc/discord-bots.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

HEALTHCHECK_DISCORD_TOKEN="${HEALTHCHECK_DISCORD_TOKEN:-}"
ALERT_CHANNEL="${BOT_HEALTH_ALERT_CHANNEL:-}"
LOG="/var/log/bot-health.log"

notify() {
  local message="$1"
  if [ -z "$HEALTHCHECK_DISCORD_TOKEN" ] || [ -z "$ALERT_CHANNEL" ]; then
    echo "$(date) notify skipped: missing HEALTHCHECK_DISCORD_TOKEN or BOT_HEALTH_ALERT_CHANNEL" >> "$LOG"
    return 0
  fi

  curl -s -X POST "https://discord.com/api/v10/channels/$ALERT_CHANNEL/messages" \
    -H "Authorization: Bot $HEALTHCHECK_DISCORD_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"⚠️ **Health Check:** $message\"}" > /dev/null 2>&1 || true
}

check_service() {
  local service="$1" name="$2"
  if ! systemctl is-active --quiet "$service"; then
    echo "$(date) $name DOWN — restarting" >> "$LOG"
    systemctl restart "$service"
    sleep 5
    if systemctl is-active --quiet "$service"; then
      notify "$name down → restarted ✅"
    else
      notify "$name restart FAILED ❌"
    fi
  fi
}

check_claude_stuck() {
  local tmux_out
  tmux_out=$(tmux capture-pane -t claude -p 2>/dev/null | tail -25 || true)

  if echo "$tmux_out" | grep -q "Stop and wait for limit to reset"; then
    echo "$(date) Claude stuck on rate limit — auto-selecting wait" >> "$LOG"
    tmux send-keys -t claude "1" Enter || true
    sleep 2
    tmux send-keys -t claude Enter || true
    notify "ม้าน้ำ ติด rate limit → auto-recovered 🔄"
  fi

  if echo "$tmux_out" | grep -q "Enter to confirm"; then
    echo "$(date) Claude stuck on confirmation — pressing Enter" >> "$LOG"
    tmux send-keys -t claude Enter || true
  fi
}

check_codex_stuck() {
  for pid in $(pgrep -f "codex exec" 2>/dev/null); do
    local age
    age=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$age" ] && [ "$age" -gt 240 ]; then
      echo "$(date) Codex process $pid stuck (${age}s) — graceful kill" >> "$LOG"
      kill -15 "$pid" 2>/dev/null || true
      sleep 5
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
      notify "ปลาวาฬ Codex process ค้าง ${age}s → killed 🔄"
    fi
  done
}

check_gemini_stuck() {
  for pid in $(pgrep -f "gemini -p" 2>/dev/null); do
    local age
    age=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$age" ] && [ "$age" -gt 360 ]; then
      echo "$(date) Gemini process $pid stuck (${age}s) — graceful kill" >> "$LOG"
      kill -15 "$pid" 2>/dev/null || true
      sleep 5
      kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
      notify "ปลาดาว Gemini process ค้าง ${age}s → killed 🔄"
    fi
  done
}

check_ram() {
  local used_pct
  used_pct=$(free | awk '/Mem:/{printf "%.0f", $3/$2*100}')
  if [ "$used_pct" -gt 90 ]; then
    echo "$(date) RAM critical: ${used_pct}%" >> "$LOG"
    notify "RAM ${used_pct}% — ใกล้เต็ม!"
  fi
}

check_service "claude-discord" "ม้าน้ำ"
check_service "whale-discord" "ปลาวาฬ"
check_service "starfish-discord" "ปลาดาว"
check_service "gemma-discord" "เจมม่า"
check_claude_stuck
check_codex_stuck
check_gemini_stuck
check_ram
