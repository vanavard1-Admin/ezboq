# Discord Bots VPS Setup

Local source of truth:
- `/Users/l168/Documents/ใบเสนอราคา/bots/discord-bots-vps`

Remote runtime path:
- `/root/projects/discord-bots`

Deploy:
- `cd /Users/l168/Documents/ใบเสนอราคา/bots/discord-bots-vps`
- `./deploy-vps.sh`

Remote secret env:
- `/etc/discord-bots.env`

Required env keys:
- `WHALE_DISCORD_TOKEN`
- `STARFISH_DISCORD_TOKEN`
- `STARFISH_GEMINI_API_KEY`
- `HEALTHCHECK_DISCORD_TOKEN`
- `BOT_HEALTH_ALERT_CHANNEL`

Notes:
- Do not edit `/root/projects/discord-bots/*.mjs` directly on the VPS.
- Always edit local files first, then deploy from this directory.
- `deploy-vps.sh` also installs systemd drop-ins so both bots read `/etc/discord-bots.env`.
