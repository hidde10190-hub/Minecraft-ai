#!/usr/bin/env bash
# ==============================================================================
# Standalone Minecraft 26.2 Fabric AI Client Launcher
# Launches a dedicated, standalone official Minecraft 26.2 Fabric Client instance
# with integrated AI Bridge, autonomous server auto-connection, and input injection.
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

SERVER="host.docker.internal:25565"
BOT_NAME="Gemini"
HEADLESS=false

# Check for simple positional arguments first
if [[ $# -gt 0 && ! "$1" =~ ^- ]]; then
  SERVER="$1"
  shift
  if [[ $# -gt 0 && ! "$1" =~ ^- ]]; then
    BOT_NAME="$1"
    shift
  fi
fi

# Parse command line options
while [[ $# -gt 0 ]]; do
  case $1 in
    -s|--server)
      SERVER="$2"
      shift 2
      ;;
    -u|-n|--username|--name)
      BOT_NAME="$2"
      shift 2
      ;;
    --headless)
      HEADLESS=true
      shift
      ;;
    -h|--help)
      echo "Usage: ./run-standalone-client.sh [options]"
      echo ""
      echo "Options:"
      echo "  -s, --server <ip:port>    Target Minecraft server (default: 127.0.0.1:25565)"
      echo "  -n, --name <username>     Bot player username (default: Gemini)"
      echo "  --headless                Run in virtual headless display (requires xvfb)"
      echo "  -h, --help                Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "====================================================================="
echo " Starting Standalone Minecraft 26.2 Fabric AI Client"
echo " Target Server: $SERVER"
echo " Bot Username : $BOT_NAME"
echo " Mode         : $( [ "$HEADLESS" = true ] && echo "Headless (Virtual Framebuffer)" || echo "Standalone Windowed Client" )"
echo "====================================================================="

export MINECRAFT_SERVER="$SERVER"
export MINECRAFT_SERVER_HOST="$SERVER"
export MINECRAFT_BOT_USERNAME="$BOT_NAME"
export BOT_NAME="$BOT_NAME"

GRADLE_ARGS="-Dfabric.gui.disable=true -Dminecraft.ai.server=$SERVER -Dminecraft.ai.botname=$BOT_NAME -DMINECRAFT_BOT_USERNAME=$BOT_NAME -DMINECRAFT_SERVER=$SERVER --args=\"--username $BOT_NAME\""

if [ "$HEADLESS" = true ]; then
  # Clean up any stale X locks from previous killed container runs
  rm -f /tmp/.X*-lock /tmp/.X11-unix/X* 2>/dev/null || true
  if command -v xvfb-run &> /dev/null; then
    echo "[Launcher] Spawning virtual display via xvfb-run..."
    xvfb-run -a -s "-screen 0 1280x720x24" ./gradlew runClient $GRADLE_ARGS
  else
    echo "[Error] xvfb-run not found. Please install xvfb (e.g. sudo apt install xvfb) or run in standard windowed mode."
    exit 1
  fi
else
  ./gradlew runClient $GRADLE_ARGS
fi
