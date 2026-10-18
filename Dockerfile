# Multi-stage Dockerfile for Standalone Minecraft 26.2 AI Controller + Java 25 Runtime
FROM eclipse-temurin:25-jdk-noble AS builder

WORKDIR /app
COPY framework/ /app/framework/
COPY start.sh /app/start.sh

WORKDIR /app/framework
RUN chmod +x gradlew && ./gradlew build --no-daemon

# Runtime Stage
FROM eclipse-temurin:25-jre-noble AS runner

WORKDIR /app

# Install lightweight dependencies (Xvfb for headless virtual display + Python for AI brain)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    libgl1-mesa-dri \
    libgl1 \
    libxi6 \
    libxrender1 \
    libxtst6 \
    libxcursor1 \
    libxrandr2 \
    libxext6 \
    libx11-6 \
    pciutils \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app /app

ENV MINECRAFT_SERVER="localhost:25565"
ENV BOT_NAME="Omega-Assistant"
ENV AI_IPC_PORT="8080"
ENV JAVA_TOOL_OPTIONS="-Dfabric.gui.disable=true"

EXPOSE 8080
EXPOSE 6080

CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x16 & export DISPLAY=:99 && sleep 2 && (x11vnc -display :99 -forever -shared -nopw -rfbport 5900 -bg -o /tmp/x11vnc.log 2>/dev/null || true) && (websockify --web=/usr/share/novnc 6080 localhost:5900 >/tmp/novnc.log 2>&1 &) ; cd /app/framework && ./gradlew runClient -Dfabric.gui.disable=true -Dminecraft.ai.server=${MINECRAFT_SERVER} -Dminecraft.ai.botname=${BOT_NAME} --no-daemon"]
