@echo off
setlocal enabledelayedexpansion
title Minecraft 26.2 Standalone Client (Gemini)

set "SERVER=host.docker.internal:25565"
set "BOT_NAME=Gemini"

:parse_args
if "%~1"=="" goto run
if /I "%~1"=="-s" (
    set "SERVER=%~2"
    shift
    shift
    goto parse_args
)
if /I "%~1"=="--server" (
    set "SERVER=%~2"
    shift
    shift
    goto parse_args
)
if /I "%~1"=="-n" (
    set "BOT_NAME=%~2"
    shift
    shift
    goto parse_args
)
if /I "%~1"=="--name" (
    set "BOT_NAME=%~2"
    shift
    shift
    goto parse_args
)
if /I "%~1"=="-u" (
    set "BOT_NAME=%~2"
    shift
    shift
    goto parse_args
)
if /I "%~1"=="--username" (
    set "BOT_NAME=%~2"
    shift
    shift
    goto parse_args
)

REM Handle positional arguments (e.g. run-standalone-client.bat 127.0.0.1:25565 Gemini)
set "PARAM=%~1"
if not "%PARAM:~0,1%"=="-" (
    if not defined SERVER_SET (
        set "SERVER=%~1"
        set "SERVER_SET=1"
        shift
        goto parse_args
    )
    if not defined BOT_SET (
        set "BOT_NAME=%~1"
        set "BOT_SET=1"
        shift
        goto parse_args
    )
)
shift
goto parse_args

:run
cd /d "%~dp0"
set "MINECRAFT_SERVER=%SERVER%"
set "MINECRAFT_SERVER_HOST=%SERVER%"
set "MINECRAFT_BOT_USERNAME=%BOT_NAME%"

echo =====================================================================
echo  Starting Standalone Minecraft 26.2 Fabric AI Client (Windows)
echo  Target Server : %SERVER%
echo  Bot Username  : %BOT_NAME%
echo  Required Java : Java 25 (OpenJDK 25)
echo =====================================================================
echo.

REM Automatically verify and resolve Java 25 for Minecraft 26.2
if exist "resolve-java25.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "resolve-java25.ps1"
    if exist ".java_home.txt" (
        set /p RESOLVED_JAVA=<.java_home.txt
        if defined RESOLVED_JAVA (
            set "JAVA_HOME=!RESOLVED_JAVA!"
            set "PATH=!RESOLVED_JAVA!\bin;!PATH!"
        )
    )
)

call gradlew.bat runClient "-Dfabric.gui.disable=true" "-Dminecraft.ai.server=%SERVER%" "-Dminecraft.ai.botname=%BOT_NAME%" "-DMINECRAFT_BOT_USERNAME=%BOT_NAME%" "-DMINECRAFT_SERVER=%SERVER%" --args="--username %BOT_NAME%"

:end
pause
