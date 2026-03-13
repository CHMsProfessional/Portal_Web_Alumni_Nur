#!/usr/bin/env pwsh
# Build and push backend images to Azure Container Registry.

param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,

    [Parameter(Mandatory = $true)]
    [string]$AcrName,

    [string]$ImageTag = "latest",

    [switch]$DoNotPush
)

$ErrorActionPreference = 'Stop'
$ScriptRoot = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $ScriptRoot "..\..")).Path

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

Write-Header "Resolve ACR"

$acrLoginServer = az acr show `
    --resource-group $ResourceGroupName `
    --name $AcrName `
    --query loginServer `
    --output tsv

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($acrLoginServer)) {
    Write-ErrorMsg "Could not resolve ACR login server"
    exit 1
}

Write-Success "ACR login server: $acrLoginServer"

Write-Header "Login ACR"

az acr login --name $AcrName | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "ACR login failed"
    exit 1
}
Write-Success "Authenticated against ACR"

$alumniApiPath = Join-Path $RepoRoot "AlumniAPI"
$contentApiPath = Join-Path $RepoRoot "ContenidoAlumniApi"

$alumniDockerfile = Join-Path $alumniApiPath "Dockerfile"
$contentDockerfile = Join-Path $contentApiPath "Dockerfile"

if (-not (Test-Path $alumniDockerfile)) {
    Write-ErrorMsg "Missing Dockerfile: $alumniDockerfile"
    exit 1
}
if (-not (Test-Path $contentDockerfile)) {
    Write-ErrorMsg "Missing Dockerfile: $contentDockerfile"
    exit 1
}

$alumniImageTag = "$acrLoginServer/alma-api:$ImageTag"
$alumniImageLatest = "$acrLoginServer/alma-api:latest"
$contentImageTag = "$acrLoginServer/content-api:$ImageTag"
$contentImageLatest = "$acrLoginServer/content-api:latest"

Write-Header "Build Alumni API"

docker build `
    --file $alumniDockerfile `
    --tag $alumniImageTag `
    --tag $alumniImageLatest `
    $alumniApiPath
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to build Alumni API image"
    exit 1
}
Write-Success "Built Alumni API image"

Write-Header "Build Content API"

docker build `
    --file $contentDockerfile `
    --tag $contentImageTag `
    --tag $contentImageLatest `
    $contentApiPath
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to build Content API image"
    exit 1
}
Write-Success "Built Content API image"

Write-Header "Built Images"

$images = docker images --format "{{.Repository}}:{{.Tag}}" | Where-Object {
    $_ -eq $alumniImageTag -or
    $_ -eq $alumniImageLatest -or
    $_ -eq $contentImageTag -or
    $_ -eq $contentImageLatest
}
$images | ForEach-Object { Write-Host "  $_" }

if ($DoNotPush) {
    Write-Info "DoNotPush enabled; skipping push"
    exit 0
}

Write-Header "Push Alumni API"

docker push $alumniImageLatest
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to push $alumniImageLatest"
    exit 1
}
docker push $alumniImageTag
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to push $alumniImageTag"
    exit 1
}
Write-Success "Pushed Alumni API images"

Write-Header "Push Content API"

docker push $contentImageLatest
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to push $contentImageLatest"
    exit 1
}
docker push $contentImageTag
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to push $contentImageTag"
    exit 1
}
Write-Success "Pushed Content API images"

Write-Header "Done"
Write-Host "Alumni API latest:  $alumniImageLatest"
Write-Host "Alumni API tag:     $alumniImageTag"
Write-Host "Content API latest: $contentImageLatest"
Write-Host "Content API tag:    $contentImageTag"
