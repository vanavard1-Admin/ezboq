#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${DISCORD_BOTS_VPS_HOST:-root@194.233.88.67}"
REMOTE_DIR="${DISCORD_BOTS_VPS_DIR:-/root/projects/discord-bots}"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"
FILES=(
  package.json
  health-check.sh
  runtime-env.mjs
  workspace-router.mjs
  starfish-bot.mjs
  starfish-config.mjs
  starfish-soul.mjs
  whale-bot.mjs
  whale-config.mjs
  whale-soul.mjs
)

for file in "${FILES[@]}"; do
  rsync -avz "${LOCAL_DIR}/${file}" "${REMOTE_HOST}:${REMOTE_DIR}/${file}"
done

ssh "${REMOTE_HOST}" "
set -euo pipefail
mkdir -p /etc/systemd/system/whale-discord.service.d /etc/systemd/system/starfish-discord.service.d
cat > /etc/systemd/system/whale-discord.service.d/override.conf <<'EOF'
[Service]
EnvironmentFile=-/etc/discord-bots.env
EOF
cat > /etc/systemd/system/starfish-discord.service.d/override.conf <<'EOF'
[Service]
UnsetEnvironment=GEMINI_API_KEY
EnvironmentFile=-/etc/discord-bots.env
EOF
chmod +x '${REMOTE_DIR}/health-check.sh'
cd '${REMOTE_DIR}'
npm install --omit=dev --no-fund --no-audit >/dev/null
systemctl daemon-reload
systemctl restart whale-discord starfish-discord
sleep 2
systemctl show whale-discord -p ActiveState -p SubState -p Result -p ExecMainStatus -p MainPID
systemctl show starfish-discord -p ActiveState -p SubState -p Result -p ExecMainStatus -p MainPID
"
