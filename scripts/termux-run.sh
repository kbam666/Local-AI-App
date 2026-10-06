#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# DroidLLM - Quick Daily Termux Server Launcher
# ==============================================================================

PORT=${PORT:-3000}
HOST="0.0.0.0"

# Acquire wake lock if available so Android doesn't kill background process
if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock
fi

export NODE_OPTIONS="--max-old-space-size=2048"
export PORT
export HOST

echo "Starting DroidLLM local server on http://${HOST}:${PORT}..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

if [ -f "server.ts" ]; then
    npx tsx server.ts
else
    npm start
fi
