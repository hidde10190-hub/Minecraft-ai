# ==============================================================================
# Java Resolver for Minecraft 26.2 Standalone Client
# ==============================================================================
# Forwarding to Java 25 resolver since Minecraft 26.2 requires Java 25.
# ==============================================================================

$targetScript = Join-Path $PSScriptRoot "resolve-java25.ps1"
if (Test-Path $targetScript) {
    & $targetScript
    exit $LASTEXITCODE
}
