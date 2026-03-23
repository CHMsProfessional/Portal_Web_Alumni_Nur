#!/usr/bin/env pwsh
# Manage azd environment values for this repository.

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("list", "show", "get", "set", "refresh")]
    [string]$Action,

    [string]$Environment = "prod",

    [string]$Key,

    [string]$Value
)

$ErrorActionPreference = 'Stop'
$ScriptRoot = $PSScriptRoot
$InfraRoot = (Resolve-Path (Join-Path $ScriptRoot "..")).Path
$RepoRoot = (Resolve-Path (Join-Path $InfraRoot "..")).Path

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Invoke-Azd {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Args
    )

    $previousDisableUpdateCheck = $env:AZD_DISABLE_UPDATE_CHECK
    $env:AZD_DISABLE_UPDATE_CHECK = "1"

    try {
        $output = azd @Args
        if ($LASTEXITCODE -ne 0) {
            throw ("azd command failed: azd " + ($Args -join " ") + " (exit code: $LASTEXITCODE)")
        }

        return $output
    }
    finally {
        $env:AZD_DISABLE_UPDATE_CHECK = $previousDisableUpdateCheck
    }
}

Set-Location $RepoRoot

try {
    switch ($Action) {
        "list" {
            Write-Header "AZD Environments"
            Invoke-Azd -Args @("env", "list", "--no-prompt") | ForEach-Object { Write-Host $_ }
        }

        "show" {
            Write-Header "AZD Environment Values ($Environment)"
            Invoke-Azd -Args @("env", "get-values", "-e", $Environment, "--no-prompt") | ForEach-Object { Write-Host $_ }
        }

        "refresh" {
            Write-Header "Refresh AZD Environment ($Environment)"
            Invoke-Azd -Args @("env", "refresh", "-e", $Environment, "--no-prompt") | Out-Null
            Write-Host "[OK] Environment refreshed" -ForegroundColor Green
        }

        "get" {
            if ([string]::IsNullOrWhiteSpace($Key)) {
                throw "Action 'get' requires -Key"
            }

            Write-Header "AZD Get Value ($Environment)"
            Invoke-Azd -Args @("env", "get-value", $Key, "-e", $Environment, "--no-prompt") | ForEach-Object { Write-Host $_ }
        }

        "set" {
            if ([string]::IsNullOrWhiteSpace($Key) -or [string]::IsNullOrWhiteSpace($Value)) {
                throw "Action 'set' requires -Key and -Value"
            }

            Write-Header "AZD Set Value ($Environment)"
            Invoke-Azd -Args @("env", "set", $Key, $Value, "-e", $Environment, "--no-prompt") | Out-Null
            Write-Host "[OK] Value set: $Key" -ForegroundColor Green
        }
    }
}
catch {
    Write-ErrorMsg $_
    exit 1
}
