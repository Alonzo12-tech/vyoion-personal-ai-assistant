$ErrorActionPreference = "Stop"
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$workerDirectory = Join-Path $PSScriptRoot "worker"
$workerConfig = Join-Path $workerDirectory "wrangler.jsonc"
$apiKeyPath = Join-Path $projectRoot "redist\api-key.txt"
$endpointPath = Join-Path $projectRoot "redist\api-endpoint.txt"

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "Node.js and npx are required only on the maintainer PC to deploy the hosted Worker. They are not required by app clients."
}
if (-not (Test-Path -LiteralPath $apiKeyPath -PathType Leaf)) {
    throw "The private maintainer key file redist\api-key.txt is missing. Add a valid key locally before deployment."
}

Push-Location $workerDirectory
try {
    & npx --yes wrangler whoami
    if ($LASTEXITCODE -ne 0) { throw "Sign in to the intended Cloudflare account with npx wrangler login, then run this deploy script again." }

    $deployOutput = & npx --yes wrangler deploy --config $workerConfig 2>&1
    $deployOutput | ForEach-Object { Write-Host $_ }
    if ($LASTEXITCODE -ne 0) { throw "The Worker code could not be deployed." }

    Get-Content -LiteralPath $apiKeyPath -Raw | & npx --yes wrangler secret put GEMINI_API_KEY --config $workerConfig
    if ($LASTEXITCODE -ne 0) { throw "Cloudflare did not accept the API key as a Worker secret. The key value was not printed by this script." }

    $workerUrl = $null
    foreach ($line in $deployOutput) {
        if ([string]$line -match 'https://[a-z0-9.-]+\.workers\.dev') {
            $workerUrl = $matches[0]
            break
        }
    }
    if (-not $workerUrl) {
        Write-Host "The Worker and secret are deployed. Copy its workers.dev URL from the Wrangler output into redist\api-endpoint.txt, then commit that endpoint file." -ForegroundColor Yellow
        return
    }

    [System.IO.File]::WriteAllText($endpointPath, $workerUrl + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Shared API deployed and configured at $workerUrl" -ForegroundColor Green
    Write-Host "The endpoint file is public configuration; the provider key remains a Cloudflare secret." -ForegroundColor Gray
} finally {
    Pop-Location
}
