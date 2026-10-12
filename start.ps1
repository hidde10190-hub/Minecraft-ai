# ==============================================================================
# Minecraft 26.2 AI Standalone Fabric Client - Windows PowerShell Starter
# ==============================================================================

param (
    [string]$Server = "127.0.0.1:25565",
    [string]$BotName = "Gemini"
)

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Minecraft 26.2 AI Standalone Fabric Client" -ForegroundColor Cyan
Write-Host "  Target Server : $Server" -ForegroundColor Cyan
Write-Host "  Bot Username  : $BotName" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan

# Check for Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker info > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[Docker Engine Detected] Starting standalone client container..." -ForegroundColor Green
        
        # Nuclear Fix: Aggressive cleanup
        Write-Host "[Status] Performing Nuclear Fix to ensure environment is clean..." -ForegroundColor Red
        
        # 1. Stop known container names
        docker stop minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama > $null 2>&1
        docker rm -f minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama > $null 2>&1
        
        # 2. Down with volumes
        docker compose down --remove-orphans > $null 2>&1
        
        # 3. Kill port conflicts
        $Conflicts = docker ps -aq --filter "publish=3000" --filter "publish=8080" --filter "publish=11434"
        if ($Conflicts) {
            Write-Host "[Cleanup] Removing containers bound to ports 3000, 8080, 11434..." -ForegroundColor Yellow
            docker stop $Conflicts > $null 2>&1
            docker rm -f $Conflicts > $null 2>&1
        }
        
        # 4. Prune exhausted subnets and stale Docker bridge networks
        Write-Host "[Status] Pruning unused Docker networks to prevent address pool exhaustion..." -ForegroundColor Cyan
        docker network prune -f > $null 2>&1
        
        $env:MINECRAFT_SERVER = $Server
        $env:MINECRAFT_SERVER_HOST = $Server
        $env:MINECRAFT_BOT_USERNAME = $BotName
        $env:BOT_NAME = $BotName
        
        Write-Host "[Status] Launching fresh containers..." -ForegroundColor Gray
        docker compose up -d --remove-orphans
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Warning] Compose failed. Pruning networks and retrying..." -ForegroundColor Yellow
            docker network prune -f > $null 2>&1
            docker compose up -d --remove-orphans
        }
        
        Write-Host "`n=====================================================================" -ForegroundColor Yellow
        Write-Host "  Client container is active! Streaming live logs below." -ForegroundColor Yellow
        Write-Host "  Press Ctrl+C at any time to stop viewing logs." -ForegroundColor Yellow
        Write-Host "=====================================================================" -ForegroundColor Yellow
        
        docker compose logs -f
        exit
    }
}

Write-Host "`n[Info] Docker not detected. Launching native Fabric client..." -ForegroundColor Gray
cd framework
if (Test-Path "run-standalone-client.bat") {
    & .\run-standalone-client.bat $Server $BotName
} else {
    ./gradlew.bat runClient -Dfabric.gui.disable=true -Dminecraft.ai.server=$Server -Dminecraft.ai.botname=$BotName --args="--username $BotName"
}

