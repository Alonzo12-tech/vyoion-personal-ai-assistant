$ErrorActionPreference = "Stop"
$port = 43187
$url = "http://127.0.0.1:$port/"
$alreadyListening = $false
$probe = [System.Net.Sockets.TcpClient]::new()
try {
    $probe.Connect([System.Net.IPAddress]::Loopback, $port)
    $alreadyListening = $true
} catch {
    $alreadyListening = $false
} finally {
    $probe.Close()
}

if ($alreadyListening) {
    try {
        $page = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        if ($page.StatusCode -eq 200 -and $page.Content.Contains("your health companion")) {
            Start-Process $url
            exit 0
        }
    } catch {
        # The listener exists but did not return the vyoiōn page.
    }
    Write-Host "Port $port is already in use by another local app. Close that app and try again." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

& (Join-Path $PSScriptRoot "serve.ps1")
