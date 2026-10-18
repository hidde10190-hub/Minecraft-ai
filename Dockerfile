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

CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x16 & export DISPLAY=:99 && cd /app/framework && ./gradlew runClient -Dfabric.gui.disable=true -Dminecraft.ai.server=${MINECRAFT_SERVER} -Dminecraft.ai.botname=${BOT_NAME} --no-daemon"]
