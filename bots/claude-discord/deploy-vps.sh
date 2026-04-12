#!/usr/bin/env bash
set -euo pipefail

REMOTE_HOST="${CLAUDE_VPS_HOST:-root@194.233.88.67}"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

rsync -avz "${LOCAL_DIR}/start-claude.sh" "${REMOTE_HOST}:/root/start-claude.sh"

ssh "${REMOTE_HOST}" "
set -euo pipefail
if [ ! -f /etc/claude-discord.env ]; then
  touch /etc/claude-discord.env
  chmod 600 /etc/claude-discord.env
fi
mkdir -p /etc/systemd/system/claude-discord.service.d
cat > /etc/systemd/system/claude-discord.service.d/override.conf <<'EOF'
[Service]
UnsetEnvironment=CLAUDE_CODE_OAUTH_TOKEN
EnvironmentFile=-/etc/claude-discord.env
ExecStartPre=-/usr/bin/tmux kill-session -t claude
ExecStart=
ExecStart=/usr/bin/tmux new-session -d -s claude -x 500 -y 50 bash /root/start-claude.sh
RuntimeMaxSec=1800
EOF
chmod +x /root/start-claude.sh
systemctl daemon-reload
systemctl restart claude-discord
sleep 2
systemctl show claude-discord -p ActiveState -p SubState -p Result -p ExecMainStatus -p MainPID
"
