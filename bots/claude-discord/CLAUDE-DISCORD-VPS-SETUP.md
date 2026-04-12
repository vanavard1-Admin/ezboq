# Claude Discord VPS Setup

Local source of truth:
- `/Users/l168/Documents/ใบเสนอราคา/bots/claude-discord`

Remote files:
- `/root/start-claude.sh`
- `/etc/claude-discord.env`

Deploy:
- `cd /Users/l168/Documents/ใบเสนอราคา/bots/claude-discord`
- `./deploy-vps.sh`

Notes:
- Do not edit `/root/start-claude.sh` directly on the VPS.
- Keep `CLAUDE_CODE_OAUTH_TOKEN` in `/etc/claude-discord.env`.
- The deploy script keeps the tmux/session reset behavior and 30-minute runtime cap.
