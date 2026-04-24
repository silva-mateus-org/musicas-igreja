param(
    [switch]$SkipDocker,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

# ── DB Tunnel config ───────────────────────────────────────────────────────
# homelab-postgres has no published port; socat bridges db_net → localhost:5433
$TunnelName      = "musicas-pg-tunnel"
$DbNetwork       = "db_net"
$DbContainer     = "homelab-postgres"
$DbContainerPort = 5432
$DbLocalPort     = 5433

$tunnelActive = $false

if (-not $SkipDocker -and -not $FrontendOnly) {
    # Verify postgres container is running
    $running = docker ps --filter "name=^${DbContainer}$" --format "{{.Names}}" 2>$null
    if ($running -ne $DbContainer) {
        Write-Host "  [!!] Container '$DbContainer' is not running. Start homelab-infra first." -ForegroundColor Red
        exit 1
    }

    Write-Host "  [..] Starting DB tunnel ($TunnelName) localhost:${DbLocalPort} -> ${DbContainer}:${DbContainerPort} ..." -ForegroundColor Yellow

    # Remove stale tunnel container if any
    docker rm -f $TunnelName 2>$null | Out-Null

    # Run socat on db_net: listens on :DbContainerPort inside (→ host:DbLocalPort)
    #   forwards to DbContainer:DbContainerPort via Docker internal DNS
    docker run -d --rm `
        --name $TunnelName `
        --network $DbNetwork `
        -p "127.0.0.1:${DbLocalPort}:${DbContainerPort}" `
        alpine/socat `
        "TCP-LISTEN:${DbContainerPort},fork" "TCP:${DbContainer}:${DbContainerPort}" 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] DB tunnel running on localhost:${DbLocalPort}." -ForegroundColor Green
        $tunnelActive = $true
    } else {
        Write-Host "  [!!] Failed to start DB tunnel. Check that '$DbNetwork' network exists and '$DbContainer' is on it." -ForegroundColor Red
        exit 1
    }
}

try {
    # Increase Node.js heap for Next.js dev server (prevent OOM during webpack cache)
    $env:NODE_OPTIONS = "--max-old-space-size=4096"

    & "$PSScriptRoot\core\scripts\start-dev.ps1" `
        -ProjectName         "MusicasIgreja" `
        -ProjectRoot         $PSScriptRoot `
        -BackendPath         "backend" `
        -BackendCsproj       "MusicasIgreja.Api.csproj" `
        -FrontendPath        "frontend" `
        -FrontendRunner      "next" `
        -ApiPortDefault      "5000" `
        -FePortDefault       "3000" `
        -SwaggerPath         "/swagger" `
        -HealthPath          "/api/health" `
        -DockerMode          "none" `
        -SkipDocker:$SkipDocker `
        -BackendOnly:$BackendOnly `
        -FrontendOnly:$FrontendOnly
} finally {
    if ($tunnelActive) {
        Write-Host "  [..] Stopping DB tunnel..." -ForegroundColor Yellow
        docker rm -f $TunnelName 2>$null | Out-Null
        Write-Host "  [OK] DB tunnel stopped." -ForegroundColor Green
    }
}
