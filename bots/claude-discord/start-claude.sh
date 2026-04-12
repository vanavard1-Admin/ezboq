#!/usr/bin/env bash
set -euo pipefail

export TERM=xterm-256color
export PATH=/root/.bun/bin:/usr/local/bin:/usr/bin:/bin:$PATH
export HOME=/root

cd /root/projects
exec claude --model "${CLAUDE_DISCORD_MODEL:-claude-sonnet-4-6}" --channels plugin:discord@claude-plugins-official
