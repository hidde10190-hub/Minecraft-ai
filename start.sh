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
    # Aggressive Cleanup (The Nuclear Fix)
    echo "[Status] Performing Nuclear Fix to ensure no stale containers exist..."
    # 1. Try to stop our specific names first
    docker stop minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama >/dev/null 2>&1 || true
    docker rm -f minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama >/dev/null 2>&1 || true
    
    # 2. Down with volumes and orphans to be absolutely sure
    docker compose down -v --remove-orphans >/dev/null 2>&1 || true
    
    # 3. Kill ANY container using our ports (3000, 8080, 8079, 11434)
    # This is the "Nuclear" part - finding containers by published port
    PORT_CONFLICTS=$(docker ps -aq --filter "publish=3000" --filter "publish=8080" --filter "publish=8079" --filter "publish=11434")
    if [ ! -z "$PORT_CONFLICTS" ]; then
        echo "[Cleanup] Stopping containers bound to ports 3000, 8080, 11434..."
        docker stop $PORT_CONFLICTS >/dev/null 2>&1 || true
        docker rm -f $PORT_CONFLICTS >/dev/null 2>&1 || true
    fi

    # 4. Prune exhausted subnets and stale Docker bridge networks
    echo "[Status] Pruning unused Docker networks to prevent address pool exhaustion..."
    docker network prune -f >/dev/null 2>&1 || true

    echo "[Status] Launching fresh containers..."
    docker compose up -d --force-recreate --remove-orphans || {
        echo "[Warning] Compose failed. Pruning networks and retrying..."
        docker network prune -f >/dev/null 2>&1 || true
        docker compose up -d --force-recreate --remove-orphans
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
