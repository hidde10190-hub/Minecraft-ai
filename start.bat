@echo off
setlocal enabledelayedexpansion
REM ==============================================================================
REM Minecraft 26.2 AI Standalone Fabric Client - Windows Starter (CMD/Batch)
REM ==============================================================================

set "SERVER=%~1"
if "%SERVER%"=="" set "SERVER=host.docker.internal:25565"
set "BOT_NAME=%~2"
if "%BOT_NAME%"=="" set "BOT_NAME=Gemini"

echo =====================================================================
echo   Minecraft 26.2 AI Standalone Fabric Client
echo   Target Server : %SERVER%
echo   Bot Username  : %BOT_NAME%
echo =====================================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [Docker Engine Detected] Starting standalone client container...
    echo.
    REM Aggressive Cleanup (The Nuclear Fix)
    echo [Status] Performing Nuclear Fix to ensure no stale containers exist...
    
        REM 0. Kill leftover Gradle daemons and wipe stale Fabric Loom locks from the
    REM    named cache volume. This fixes the hang:
    REM    "Lock for cache='/root/.gradle/caches/fabric-loom' is currently held by pid 'NNN'"
    REM    which happens when a previous runClient was interrupted (Ctrl+C / auto-restart).
    REM    NOTE: single docker exec only works while the old container still exists, so we
    REM    also do a --rm helper pass that finds ALL *.lock files inside the volume.
    echo [Cleanup] Killing stale Gradle daemons and clearing Fabric Loom locks...
    docker exec minecraft-fabric-standalone bash -c "kill -9 \$(pgrep java) 2>/dev/null; cd /app/framework 2>/dev/null && ./gradlew --stop 2>/dev/null" >nul 2>&1
    docker run --rm -v minecraft-gradle-cache:/g alpine sh -c "find /g -name '*.lock' -delete; find /g -name 'registry.lock' -delete" >nul 2>&1

REM 1. Try to stop our specific names first
    docker stop minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama >nul 2>&1
    docker rm -f minecraft-fabric-standalone minecraft-ai-dashboard minecraft-ollama >nul 2>&1
    
    REM 2. Down with volumes and orphans to be absolutely sure
    docker compose down --remove-orphans >nul 2>&1
    
    REM 3. Kill ANY container using our ports (3000, 8080, 8079, 11434)
    for /f "tokens=*" %%i in ('docker ps -aq --filter "publish=3000" --filter "publish=8080" --filter "publish=8079" --filter "publish=11434"') do (
        echo [Cleanup] Stopping containers bound to ports 3000, 8080, 11434...
        docker stop %%i >nul 2>&1
        docker rm -f %%i >nul 2>&1
    )
    
    REM 4. Prune exhausted subnets and stale Docker bridge networks
    echo [Status] Pruning unused Docker networks to prevent subnet pool exhaustion...
    docker network prune -f >nul 2>&1
    
    set "MINECRAFT_SERVER=%SERVER%"
    set "MINECRAFT_SERVER_HOST=%SERVER%"
    set "MINECRAFT_BOT_USERNAME=%BOT_NAME%"
    set "BOT_NAME=%BOT_NAME%"
    
    echo [Status] Launching fresh containers...
    docker compose up -d --remove-orphans
    
    if %ERRORLEVEL% NEQ 0 (
        echo [Warning] Docker Compose failed. Pruning subnetted networks and retrying...
        docker network prune -f >nul 2>&1
        docker compose up -d --remove-orphans
        if !ERRORLEVEL! NEQ 0 (
            echo [Error] Docker Compose failed to start. Falling back to native...
            goto :NATIVE
        )
    )
    
    echo.
    echo =====================================================================
    echo   Client container is active! Streaming live logs below.
    echo   Press Ctrl+C at any time to stop viewing logs.
    echo =====================================================================
    echo.
    docker compose logs -f
    exit /b 0
)

:NATIVE
echo [Info] Docker not detected or not running. Launching native Fabric client...
cd framework
if exist "run-standalone-client.bat" (
    call run-standalone-client.bat "%SERVER%" "%BOT_NAME%"
) else (
    call gradlew.bat runClient -Dfabric.gui.disable=true -Dminecraft.ai.server="%SERVER%" -Dminecraft.ai.botname="%BOT_NAME%" --args="--username %BOT_NAME%"
)
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Error] Minecraft client exited with an error. 
    echo Check the logs above for any dependency or mapping errors.
)
pause

