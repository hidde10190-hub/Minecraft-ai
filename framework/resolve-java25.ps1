# ==============================================================================
# Automatic Java 25 Resolver for Minecraft 26.2 Standalone Client
# ==============================================================================
# Minecraft 26.2 and modern Fabric Loom require Java 25 (class file major version 69).
# This script automatically detects installed Java 25 JDK or provisions portable OpenJDK 25.
# ==============================================================================

$ErrorActionPreference = "Continue"

function Get-JavaMajorVersion([string]$javaExe) {
    if (-not (Test-Path $javaExe)) { return $null }
    try {
        $pinfo = New-Object System.Diagnostics.ProcessStartInfo
        $pinfo.FileName = $javaExe
        $pinfo.Arguments = "-version"
        $pinfo.RedirectStandardError = $true
        $pinfo.UseShellExecute = $false
        $pinfo.CreateNoWindow = $true
        $p = [System.Diagnostics.Process]::Start($pinfo)
        $output = $p.StandardError.ReadToEnd()
        [void]$p.WaitForExit(3000)

        if ($output -match 'version "(\d+)') {
            return [int]$matches[1]
        }
        if ($output -match 'openjdk (\d+)') {
            return [int]$matches[1]
        }
        if ($output -match 'version "1\.(\d+)') {
            return [int]$matches[1]
        }
    } catch {
        return $null
    }
    return $null
}

$outputFile = Join-Path $PSScriptRoot ".java_home.txt"
if (Test-Path $outputFile) {
    Remove-Item -Force $outputFile -ErrorAction SilentlyContinue
}

# 1. Check local cached portable JDK 25 first
$localJdkDir = Join-Path $PSScriptRoot ".jdk25"
if (Test-Path $localJdkDir) {
    $subDirs = Get-ChildItem -Path $localJdkDir -Directory -ErrorAction SilentlyContinue
    foreach ($dir in @($localJdkDir) + $subDirs) {
        $candidateExe = Join-Path $dir.FullName "bin\java.exe"
        if (Test-Path $candidateExe) {
            $ver = Get-JavaMajorVersion $candidateExe
            if ($ver -and $ver -ge 25) {
                Write-Host "[Java] Using local portable Java $ver JDK: $($dir.FullName)" -ForegroundColor Green
                Set-Content -Path $outputFile -Value $dir.FullName
                exit 0
            }
        }
    }
}

# 2. Check current JAVA_HOME
if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    $ver = Get-JavaMajorVersion "$env:JAVA_HOME\bin\java.exe"
    if ($ver -and $ver -ge 25) {
        Write-Host "[Java] Active JAVA_HOME is Java 25 compatible ($ver): $env:JAVA_HOME" -ForegroundColor Green
        Set-Content -Path $outputFile -Value $env:JAVA_HOME
        exit 0
    } else {
        Write-Host "[Java] Notice: Active JAVA_HOME ($env:JAVA_HOME) is Java $ver." -ForegroundColor Yellow
        Write-Host "[Java] Minecraft 26.2 requires Java 25 (bytecode version 69)." -ForegroundColor Yellow
    }
}

# 3. Check system PATH java
$sysJava = Get-Command "java" -ErrorAction SilentlyContinue
if ($sysJava) {
    $sysVer = Get-JavaMajorVersion $sysJava.Source
    if ($sysVer -and $sysVer -ge 25) {
        $binDir = Split-Path $sysJava.Source -Parent
        $parentDir = Split-Path $binDir -Parent
        if (Test-Path "$parentDir\bin\java.exe") {
            Write-Host "[Java] System Java is Java 25 compatible ($sysVer): $parentDir" -ForegroundColor Green
            Set-Content -Path $outputFile -Value $parentDir
            exit 0
        }
    } else {
        Write-Host "[Java] System default Java is version $sysVer. Minecraft 26.2 requires Java 25." -ForegroundColor Yellow
    }
}

# 4. Search common installation directories for Java 25 on Windows
Write-Host "[Java] Searching for an installed Java 25 JDK on your system..." -ForegroundColor Cyan

$searchPatterns = @(
    "$env:ProgramFiles\Eclipse Adoptium\jdk-25*",
    "$env:ProgramFiles\Java\jdk-25*",
    "$env:ProgramFiles\Microsoft\jdk-25*",
    "$env:ProgramFiles\Amazon Corretto\jdk25*",
    "$env:ProgramFiles\Zulu\zulu-25*",
    "$env:ProgramFiles\BellSoft\LibericaJDK-25*",
    "$env:ProgramFiles\Semeru\jdk-25*",
    "$env:USERPROFILE\.jdks\*25*",
    "$env:USERPROFILE\.gradle\jdks\*25*",
    "$env:LOCALAPPDATA\Packages\Microsoft.4297127D64C94_8wekyb3d8bbwe\LocalCache\Local\runtime\java-runtime-gamma\windows-x64\java-runtime-gamma",
    "$env:LOCALAPPDATA\Packages\Microsoft.4297127D64C94_8wekyb3d8bbwe\LocalCache\Local\runtime\java-runtime-delta\windows-x64\java-runtime-delta",
    "$env:LOCALAPPDATA\.minecraft\runtime\*\windows-x64\*",
    "${env:ProgramFiles(x86)}\Minecraft Launcher\runtime\*\windows-x64\*"
)

foreach ($pat in $searchPatterns) {
    try {
        $resolved = Resolve-Path $pat -ErrorAction SilentlyContinue
        if ($resolved) {
            foreach ($match in $resolved) {
                $dirPath = $match.Path
                $exe = Join-Path $dirPath "bin\java.exe"
                if (Test-Path $exe) {
                    $ver = Get-JavaMajorVersion $exe
                    if ($ver -and $ver -ge 25) {
                        Write-Host "[Java] Found compatible Java $ver at: $dirPath" -ForegroundColor Green
                        Set-Content -Path $outputFile -Value $dirPath
                        exit 0
                    }
                }
            }
        }
    } catch {}
}

# 5. If no Java 25 found, auto-download portable Adoptium OpenJDK 25
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host "  No Java 25 detected on this machine. Minecraft 26.2 requires Java 25." -ForegroundColor Yellow
Write-Host "  Downloading portable Eclipse Temurin OpenJDK 25..." -ForegroundColor Cyan
Write-Host "  Destination: framework\.jdk25" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Yellow
Write-Host ""

$zipPath = Join-Path $PSScriptRoot ".jdk25_download.zip"
$extractTarget = Join-Path $PSScriptRoot ".jdk25"

if (-not (Test-Path $extractTarget)) {
    New-Item -ItemType Directory -Path $extractTarget -Force | Out-Null
}

# Try Adoptium EA / latest binary for Java 25
$downloadUrls = @(
    "https://api.adoptium.net/v3/binary/latest/25/ea/windows/x64/jdk/hotspot/normal/eclipse",
    "https://api.adoptium.net/v3/binary/latest/25/ga/windows/x64/jdk/hotspot/normal/eclipse"
)

$downloadOk = $false
foreach ($downloadUrl in $downloadUrls) {
    try {
        $curlCmd = Get-Command "curl.exe" -ErrorAction SilentlyContinue
        if ($curlCmd) {
            Write-Host "[Download] Using curl to download Java 25..." -ForegroundColor Cyan
            & curl.exe -L -f -o $zipPath $downloadUrl
            if ($LASTEXITCODE -eq 0 -and (Test-Path $zipPath) -and (Get-Item $zipPath).Length -gt 10000000) {
                $downloadOk = $true
                break
            }
        }
    } catch {}

    if (-not $downloadOk) {
        try {
            Write-Host "[Download] Downloading via PowerShell WebClient: $downloadUrl..." -ForegroundColor Cyan
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $wc = New-Object System.Net.WebClient
            $wc.DownloadFile($downloadUrl, $zipPath)
            if ((Test-Path $zipPath) -and (Get-Item $zipPath).Length -gt 10000000) {
                $downloadOk = $true
                break
            }
        } catch {
            Write-Host "[Download Notice] Endpoint failed, trying next..." -ForegroundColor Yellow
        }
    }
}

if ($downloadOk) {
    Write-Host "[Extract] Extracting portable JDK 25 archive..." -ForegroundColor Cyan
    try {
        $tarCmd = Get-Command "tar.exe" -ErrorAction SilentlyContinue
        if ($tarCmd) {
            & tar.exe -xf $zipPath -C $extractTarget
        } else {
            Expand-Archive -Path $zipPath -DestinationPath $extractTarget -Force
        }
        Remove-Item -Force $zipPath -ErrorAction SilentlyContinue

        # Find the extracted root
        $extractedDirs = Get-ChildItem -Path $extractTarget -Directory
        foreach ($d in $extractedDirs) {
            $exe = Join-Path $d.FullName "bin\java.exe"
            if (Test-Path $exe) {
                Write-Host "[Java] Portable JDK 25 successfully installed: $($d.FullName)" -ForegroundColor Green
                Set-Content -Path $outputFile -Value $d.FullName
                exit 0
            }
        }
    } catch {
        Write-Host "[Extraction Error] $($_.Exception.Message)" -ForegroundColor Red
    }
}

# If failed, output helpful message
Write-Host ""
Write-Host "[!] Could not automatically prepare Java 25." -ForegroundColor Red
Write-Host "Minecraft 26.2 requires Java 25. Please download and install Eclipse Temurin 25 from:" -ForegroundColor Yellow
Write-Host "https://adoptium.net/temurin/releases/?version=25" -ForegroundColor Cyan
Write-Host ""
exit 1
