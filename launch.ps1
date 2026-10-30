$ErrorActionPreference = "Stop"
$basePort = 43187
$lastPort = 43217
$expectedVersion = "2026.10.31.3"
$brand = "vyoi" + [char]0x014D + "n"

function Test-LocalPort {
    param([int]$Port)
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $client.Connect([System.Net.IPAddress]::Loopback, $Port)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Get-HealthyAppUrl {
    param([int]$Port, [string]$Version)
    $url = "http://127.0.0.1:$Port/"
    try {
        $response = Invoke-WebRequest -Uri ($url + "api/status") -UseBasicParsing -TimeoutSec 2
        $status = $response.Content | ConvertFrom-Json -ErrorAction Stop
        if ([string]$status.version -eq $Version -and [int]$status.port -eq $Port) {
            return $url
        }
    } catch {
        # A listener without the current health signature is an older or unrelated server.
    }
    return $null
}

$selectedPort = -1
$existingUrl = $null
$foundOlderServer = $false
for ($candidatePort = $basePort; $candidatePort -le $lastPort; $candidatePort++) {
    if (Test-LocalPort -Port $candidatePort) {
        $healthyUrl = Get-HealthyAppUrl -Port $candidatePort -Version $expectedVersion
        if ($healthyUrl) {
            $existingUrl = $healthyUrl
            break
        }
        if ($candidatePort -eq $basePort) { $foundOlderServer = $true }
        continue
    }
    $selectedPort = $candidatePort
    break
}

if ($existingUrl) {
    Write-Host "$brand is already running. Opening the current app at $existingUrl" -ForegroundColor Green
    Start-Process -FilePath $existingUrl
    return
}

if ($selectedPort -lt 0) {
    Write-Host "No free local app port was found between $basePort and $lastPort. Close an unused local app and start $brand again." -ForegroundColor Red
    return
}

if ($foundOlderServer) {
    Write-Host "A previous $brand server is still running. Starting this updated copy at port $selectedPort." -ForegroundColor Yellow
}

& (Join-Path $PSScriptRoot "serve.ps1") -Port $selectedPort
