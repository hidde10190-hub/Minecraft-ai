#!/usr/bin/env bash
# ==============================================================================
# Minecraft 26.2 AI Standalone Fabric Client - 1-Click Starter
# ==============================================================================
# Usage:
#   ./start.sh
#   ./start.sh host.docker.internal:25565 Gemini
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

SERVER="${1:-${MINECRAFT_SERVER:-host.docker.internal:25565}}"
BOT_NAME="${2:-${MINECRAFT_BOT_USERNAME:-Gemini}}"

export MINECRAFT_SERVER="$SERVER"
export MINECRAFT_SERVER_HOST="$SERVER"
export MINECRAFT_BOT_USERNAME="$BOT_NAME"
export BOT_NAME="$BOT_NAME"

echo "====================================================================="
echo "  Minecraft 26.2 AI Standalone Fabric Client"
echo "  Target Server : $SERVER"
echo "  Bot Username  : $BOT_NAME"
echo "====================================================================="
echo ""

# If Docker is available, run containerized
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "[Docker Engine Detected] Starting standalone client container..."
    echo ""
    # FAST STARTUP: the old "Nuclear Fix" ran `docker compose down -v` on every
    # launch, which DELETED the gradle_cache / node_modules volumes -> full
    # re-download of Minecraft + npm deps each start. It also force-recreated and
    # killed any container publishing our ports. Now we reuse running containers
    # and only clean up stale instances of OUR services (caches preserved).
    echo "[Status] Checking for existing containers..."
    RUNNING=$(docker ps -q --filter "name=minecraft-fabric-standalone" --filter "name=minecraft-ai-dashboard" | grep -c . || true)
    if [ "${RUNNING:-0}" != "0" ]; then
        echo "[Status] Containers already running - attaching to live logs."
        echo "         (use 'docker compose up -d --force-recreate' to restart fresh)"
        docker compose logs -f
        exit 0
    fi
    echo "[Status] Cleaning stale instances of our services (caches preserved)..."
    docker stop minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama >/dev/null 2>&1 || true
    docker rm   minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama >/dev/null 2>&1 || true

    echo "[Status] Launching containers..."
        # Wipe stale Fabric Loom locks left by interrupted runs (fixes the
    # "Lock for cache='/root/.gradle/caches/fabric-loom' is currently held" hang)
    # alpine is used instead of a JDK image: it's tiny, pre-cached on most hosts,
    # and find(1) is all we need.
    docker run --rm -v minecraft-gradle-cache:/g alpine sh -c "find /g -name '*.lock' -delete" >/dev/null 2>&1 || true

docker compose up -d --remove-orphans || {
        echo "[Warning] Compose failed. Pruning networks and retrying..."
        docker network prune -f >/dev/null 2>&1 || true
        docker compose up -d --remove-orphans
    }
    echo ""
    echo "====================================================================="
    echo "  Client container is active! Streaming live logs below."
    echo "  Press Ctrl+C at any time to exit log streaming."
    echo "====================================================================="
    echo ""
    docker compose logs -f
    exit 0
fi

# Launch native Fabric standalone client
echo "[Info] Launching native Fabric standalone client..."
cd framework
chmod +x run-standalone-client.sh gradlew 2>/dev/null || true
./run-standalone-client.sh --server "$SERVER" --username "$BOT_NAME"
