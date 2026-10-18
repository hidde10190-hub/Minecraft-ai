#!/usr/bin/env bash
# ==============================================================================
# Standalone Minecraft 26.2 Headless Client Launcher
# Runs the full official Minecraft 26.2 client inside a headless virtual framebuffer (Xvfb)
# Perfect for running the AI bot on a Linux VPS, dedicated server, or Docker container
# without any physical monitor, GPU display, or GUI window.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

SERVER="${1:-host.docker.internal:25565}"
BOT_NAME="${2:-Gemini}"

echo "Checking for xvfb..."
if ! command -v xvfb-run &> /dev/null; then
    echo "[!] xvfb-run is not installed."
    echo "Install xvfb: sudo apt-get update && sudo apt-get install -y xvfb libgl1-mesa-dri"
    exit 1
fi

echo "====================================================================="
echo " Starting Headless Standalone Minecraft 26.2 AI Client"
echo " Server : $SERVER"
echo " Bot    : $BOT_NAME"
echo " Display: Virtual 1280x720x24 Software Rasterizer"
echo "====================================================================="

# Clean up any stale X locks from previous killed container runs
rm -f /tmp/.X*-lock /tmp/.X11-unix/X* 2>/dev/null || true

export MINECRAFT_SERVER_HOST="$SERVER"
export MINECRAFT_BOT_USERNAME="$BOT_NAME"

xvfb-run -a -s "-screen 0 1280x720x24" ./gradlew runClient \
  -Dfabric.gui.disable=true \
  -Dminecraft.ai.server="$SERVER" \
  -Dminecraft.ai.botname="$BOT_NAME" \
  --args="--username $BOT_NAME"
