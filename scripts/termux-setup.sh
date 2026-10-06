#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# DroidLLM - Automated Android Termux Setup & Local Server Runner
# ==============================================================================
# This script configures Termux on Android, installs Node.js LTS,
# requests storage permissions, installs dependencies, and boots the local server.
#
# Usage in Termux:
#   curl -sSL http://localhost:3000/api/termux/setup.sh | bash
#   or: bash scripts/termux-setup.sh
# ==============================================================================

set -e

# ANSI Color codes for Termux terminal
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ____             _     _ _     _     __  __ "
echo " |  _ \ _ __ ___  (_) __| | |   | |   |  \/  |"
echo " | | | | '__/ _ \ | |/ _\` | |   | |   | |\/| |"
echo " | |_| | | | (_) || | (_| | |___| |___| |  | |"
echo " |____/|_|  \___/ |_|\__,_|_____|_____|_|  |_|"
echo -e "${NC}"
echo -e "${GREEN}${BOLD}=== Android Termux Local Server Installer ===${NC}"
echo -e "${BLUE}Running on-device inside Termux Linux environment...${NC}\n"

# 1. Check if running inside Termux
if [ -d "/data/data/com.termux" ]; then
    echo -e "${GREEN}✓ Detected Android Termux environment${NC}"
else
    echo -e "${YELLOW}! Not in standard Termux path; proceeding as generic Linux/Android...${NC}"
fi

# 2. Update Termux repositories & install packages
echo -e "\n${CYAN}[1/5] Updating Termux packages & installing Node.js LTS...${NC}"
if command -v pkg >/dev/null 2>&1; then
    pkg update -y
    pkg install -y nodejs-lts git clang termux-api termux-tools curl
elif command -v apt >/dev/null 2>&1; then
    apt update -y && apt install -y nodejs npm git curl
fi

# 3. Check Node & NPM versions
echo -e "\n${CYAN}[2/5] Verifying Node.js & hardware architecture...${NC}"
NODE_VER=$(node -v 2>/dev/null || echo "not found")
NPM_VER=$(npm -v 2>/dev/null || echo "not found")
ARCH=$(uname -m)

echo -e "  • Node.js:  ${GREEN}${NODE_VER}${NC}"
echo -e "  • NPM:      ${GREEN}${NPM_VER}${NC}"
echo -e "  • CPU Arch: ${GREEN}${ARCH}${NC}"

if [ "$NODE_VER" = "not found" ]; then
    echo -e "${RED}✗ Node.js is not installed. Please run: pkg install nodejs-lts${NC}"
    exit 1
fi

# 4. Request Android Storage Access if needed
echo -e "\n${CYAN}[3/5] Checking Android storage permissions...${NC}"
if [ -d "/data/data/com.termux" ] && [ ! -d "$HOME/storage" ]; then
    echo -e "${YELLOW}Requesting Android storage access (popup may appear on your screen)...${NC}"
    termux-setup-storage || true
fi

# 5. Acquire Termux CPU Wake Lock to prevent Android battery sleep
echo -e "\n${CYAN}[4/5] Enabling Termux CPU Wake Lock...${NC}"
if command -v termux-wake-lock >/dev/null 2>&1; then
    termux-wake-lock
    echo -e "${GREEN}✓ CPU Wake Lock active (prevents Android OS from pausing server in background)${NC}"
else
    echo -e "${YELLOW}Notice: termux-wake-lock not found. For background execution, install termux-api.${NC}"
fi

# 6. Install Project Dependencies & Build
echo -e "\n${CYAN}[5/5] Installing dependencies & launching local server...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies (this only happens once)...${NC}"
    npm install --no-audit --no-fund
fi

# Build production bundle if dist doesn't exist
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Compiling client assets (npm run build)...${NC}"
    npm run build
fi

# 7. Get Local Phone IP Addresses
WIFI_IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "")
PORT=${PORT:-3000}

echo -e "\n${GREEN}${BOLD}======================================================${NC}"
echo -e "${GREEN}${BOLD}   🚀 DroidLLM Local Server is READY in Termux!       ${NC}"
echo -e "${GREEN}${BOLD}======================================================${NC}"
echo -e "${CYAN}Access your local server at:${NC}"
echo -e "  • This Phone (Local):    ${BOLD}http://localhost:${PORT}${NC}"
echo -e "  • Loopback:              ${BOLD}http://127.0.0.1:${PORT}${NC}"
if [ -n "$WIFI_IP" ]; then
    echo -e "  • Other Devices (Wi-Fi): ${BOLD}http://${WIFI_IP}:${PORT}${NC}"
fi
echo -e "\n${YELLOW}Press Ctrl+C at any time to stop the server.${NC}\n"

# Run server with Android memory optimization
export NODE_OPTIONS="--max-old-space-size=2048"
export PORT=${PORT}
export HOST=0.0.0.0

if [ -f "server.ts" ]; then
    if command -v npx >/dev/null 2>&1; then
        npx tsx server.ts
    else
        node server.ts
    fi
else
    npm start
fi
