#!/usr/bin/env python3
"""
Single-Click Universal Starter (Python Cross-Platform)
Automatically detects Docker or launches the official Minecraft 26.2 Fabric Standalone Client.
Usage: python start.py [SERVER] [USERNAME]
"""

import os
import sys
import subprocess
import shutil

def is_docker_running():
    if shutil.which("docker") is None:
        return False
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception:
        return False

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    framework_dir = os.path.join(root_dir, "framework")

    server = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MINECRAFT_SERVER", "host.docker.internal:25565")
    bot_name = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("MINECRAFT_BOT_USERNAME", "Gemini")

    os.environ["MINECRAFT_SERVER"] = server
    os.environ["MINECRAFT_BOT_USERNAME"] = bot_name

    print("=" * 65)
    print("  Minecraft 26.2 AI Standalone Fabric Client - 1-Click Starter")
    print(f"  Target Server : {server}")
    print(f"  Bot Username  : {bot_name}")
    print("=" * 65)
    print()

    if is_docker_running():
        print("[Docker Engine Detected] Starting standalone client container...")
        # Nuclear Fix: Aggressive cleanup
        print("[Status] Ensuring environment is clean...")
        subprocess.run(["docker", "compose", "down", "--remove-orphans"], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=root_dir)
        
        # Kill ANY container using our ports (3000, 8080, 8079, 11434)
        ports = ["3000", "8080", "8079", "11434"]
        for port in ports:
            res = subprocess.run(["docker", "ps", "-q", "--filter", f"publish={port}"], 
                                 capture_output=True, text=True)
            ids = res.stdout.strip().split()
            if ids:
                print(f"[Cleanup] Stopping containers on port {port}...")
                subprocess.run(["docker", "stop"] + ids, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.run(["docker", "rm", "-f"] + ids, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        subprocess.run(["docker", "stop", "minecraft-fabric-standalone", "minecraft-ai-dashboard", "minecraft-ollama"], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=root_dir)
        subprocess.run(["docker", "rm", "-f", "minecraft-fabric-standalone", "minecraft-ai-dashboard", "minecraft-ollama"], 
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=root_dir)
        
        print("[Status] Launching fresh containers...")
        # Wipe stale Fabric Loom locks left by interrupted runs (fixes the
        # "Lock for cache='/root/.gradle/caches/fabric-loom' is currently held" hang)
        subprocess.run(["docker", "run", "--rm", "-v", "minecraft-gradle-cache:/g",
                        "eclipse-temurin:25-jdk-noble", "bash", "-c",
                        "find /g -name '*.lock' -delete"],
                       capture_output=True, cwd=root_dir)
        subprocess.run(["docker", "compose", "up", "-d", "--remove-orphans"], cwd=root_dir)
        print("\nStreaming live container logs (Ctrl+C to detach):")
        try:
            subprocess.run(["docker", "compose", "logs", "-f"], cwd=root_dir)
        except KeyboardInterrupt:
            print("\n[Launcher] Detached from container logs. Container is still running.")
        return

    print("[Info] Docker not running. Starting native standalone client...")
    is_windows = sys.platform.startswith("win")
    if is_windows:
        cmd = ["cmd.exe", "/c", "run-standalone-client.bat", server, bot_name]
    else:
        script = os.path.join(framework_dir, "run-standalone-client.sh")
        try:
            os.chmod(script, 0o755)
        except Exception:
            pass
        cmd = [script, "--server", server, "--username", bot_name]

    try:
        subprocess.run(cmd, cwd=framework_dir)
    except KeyboardInterrupt:
        print("\n[Launcher] Shutdown requested by user.")

if __name__ == "__main__":
    main()
