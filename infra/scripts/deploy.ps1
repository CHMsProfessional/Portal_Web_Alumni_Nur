#!/usr/bin/env pwsh
# ============================================================================
# Script: deploy.ps1
# Description: Deploy Azure infrastructure from Bicep templates
# ============================================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectName,

    [string]$EnvironmentName = "dev",

    [string]$ResourceGroupName,

    [string]$Location = "eastus",

    [string]$PostgresqlLocation = "centralus",

    [Parameter(Mandatory = $true)]
    [securestring]$PostgresqlAdminPassword,

    [string]$ParametersFile = "parameters.json",

    [switch]$ValidateOnly,

    [switch]$NoWait,

    [switch]$AutoApprove,

    [switch]$UseAzd,

    [string]$AzdEnvironment,

    [switch]$ShowAzdEnvValues
)

# ============================================================================
# Path Resolution
# ============================================================================

$ScriptRoot = $PSScriptRoot
$InfraRoot = (Resolve-Path (Join-Path $ScriptRoot "..")).Path
$RepoRoot = (Resolve-Path (Join-Path $InfraRoot "..")).Path
$MainBicepPath = Join-Path $InfraRoot "main.bicep"

if (-not [System.IO.Path]::IsPathRooted($ParametersFile)) {
    $ParametersFile = Join-Path $InfraRoot $ParametersFile
}

if ([string]::IsNullOrWhiteSpace($ResourceGroupName)) {
    $ResourceGroupName = "rg-$ProjectName-$EnvironmentName"
}

if ([string]::IsNullOrWhiteSpace($AzdEnvironment)) {
    $AzdEnvironment = $EnvironmentName
}

# ============================================================================
# Helper Functions
# ============================================================================

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

function Write-WarningMsg {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Build-DeploymentArgs {
    param(
        [string]$Rg,
        [string]$TemplateFile,
        [string]$ParamsFile,
        [string]$Proj,
        [string]$Env,
        [string]$Loc,
        [string]$PgLoc,
        [string]$DbPassword
    )

    $args = @(
        "--resource-group", $Rg,
        "--template-file", $TemplateFile
    )

    # No se agrega automaticamente el archivo de parametros porque puede contener
    # claves heredadas que no existan en la plantilla activa.

    $args += @(
        "--parameters", "projectName=$Proj",
        "--parameters", "environment=$Env",
        "--parameters", "location=$Loc",
        "--parameters", "postgresqlLocation=$PgLoc",
        "--parameters", "postgresqlAdminPassword=$DbPassword"
    )

    return $args
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

function Ensure-AzdEnvironment {
    param([string]$EnvName)

    $envListRaw = Invoke-Azd -Args @("env", "list", "--no-prompt")

    $exists = ($envListRaw -join "`n") -match "(^|\s)$([Regex]::Escape($EnvName))(\s|$)"

    if ($exists) {
        Write-Info "Selecting existing azd environment: $EnvName"
        Invoke-Azd -Args @("env", "select", $EnvName, "--no-prompt") | Out-Null
    }
    else {
        Write-Info "Creating azd environment: $EnvName"
        Invoke-Azd -Args @("env", "new", $EnvName, "--no-prompt") | Out-Null
    }
}

function Set-AzdInfrastructureVariables {
    param(
        [string]$EnvName,
        [string]$Proj,
        [string]$Env,
        [string]$Rg,
        [string]$Loc,
        [string]$PgLoc,
        [string]$DbPassword
    )

    Write-Info "Setting azd environment values"
    Invoke-Azd -Args @("env", "set", "AZURE_ENV_NAME", $EnvName, "-e", $EnvName, "--no-prompt") | Out-Null
    Invoke-Azd -Args @("env", "set", "AZURE_LOCATION", $Loc, "-e", $EnvName, "--no-prompt") | Out-Null
    Invoke-Azd -Args @("env", "set", "AZURE_RESOURCE_GROUP", $Rg, "-e", $EnvName, "--no-prompt") | Out-Null
    Invoke-Azd -Args @("env", "set", "projectName", $Proj, "-e", $EnvName, "--no-prompt") | Out-Null
    Invoke-Azd -Args @("env", "set", "environment", $Env, "-e", $EnvName, "--no-prompt") | Out-Null
    Invoke-Azd -Args @("env", "set", "location", $Loc, "-e", $EnvName, "--no-prompt") | Out-Null
    Invoke-Azd -Args @("env", "set", "postgresqlLocation", $PgLoc, "-e", $EnvName, "--no-prompt") | Out-Null
    Invoke-Azd -Args @("env", "set", "postgresqlAdminPassword", $DbPassword, "-e", $EnvName, "--no-prompt") | Out-Null
}

# ============================================================================
# Validate Prerequisites
# ============================================================================

Write-Header "Validate Prerequisites"

try {
    $azVersion = az version | ConvertFrom-Json
    Write-Success "Azure CLI version: $($azVersion.'azure-cli')"
}
catch {
    Write-ErrorMsg "Azure CLI is not installed or not in PATH"
    exit 1
}

try {
    $bicepVersion = az bicep version
    Write-Success "Bicep available: $bicepVersion"
}
catch {
    Write-ErrorMsg "Bicep CLI is not available"
    exit 1
}

try {
    $account = az account show | ConvertFrom-Json
    Write-Success "Authenticated as: $($account.user.name)"
}
catch {
    Write-ErrorMsg "Not authenticated in Azure. Run 'az login'"
    exit 1
}

if ($UseAzd) {
    try {
        $azdVersion = azd version
        Write-Success "azd available: $azdVersion"
    }
    catch {
        Write-ErrorMsg "azd is not installed or not in PATH"
        exit 1
    }

    $azureYamlPath = Join-Path $RepoRoot "azure.yaml"
    if (-not (Test-Path $azureYamlPath)) {
        Write-ErrorMsg "azure.yaml not found at repo root: $azureYamlPath"
        exit 1
    }
}

# ============================================================================
# Prepare Subscription and Resource Group
# ============================================================================

Write-Header "Prepare Subscription and Resource Group"

$subscription = az account show | ConvertFrom-Json
Write-Info "Subscription: $($subscription.name) ($($subscription.id))"
Write-Info "Tenant: $($subscription.tenantId)"

try {
    $rgExists = az group exists --name $ResourceGroupName | ConvertFrom-Json

    if (-not $rgExists) {
        Write-Info "Creating resource group $ResourceGroupName in $Location"
        az group create `
            --name $ResourceGroupName `
            --location $Location `
            --tags "project=$ProjectName" "environment=$EnvironmentName" `
            | Out-Null
        Write-Success "Resource group created"
    }
    else {
        Write-Success "Resource group already exists"
    }
}
catch {
    Write-ErrorMsg "Error creating/verifying resource group: $_"
    exit 1
}

if ($UseAzd) {
    Write-Header "Deploy With AZD"

    $previousLocation = Get-Location
    $ptrAzd = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PostgresqlAdminPassword)
    $PostgresqlAdminPasswordPlainAzd = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptrAzd)
    Set-Location $RepoRoot

    try {
        Ensure-AzdEnvironment -EnvName $AzdEnvironment

        Set-AzdInfrastructureVariables `
            -EnvName $AzdEnvironment `
            -Proj $ProjectName `
            -Env $EnvironmentName `
            -Rg $ResourceGroupName `
            -Loc $Location `
            -PgLoc $PostgresqlLocation `
            -DbPassword $PostgresqlAdminPasswordPlainAzd

        Write-Info "Running azd provision preview"
        Invoke-Azd -Args @("provision", "--preview", "-e", $AzdEnvironment, "--no-prompt") | Out-Null
        Write-Success "azd provision preview completed"

        if ($ValidateOnly) {
            Write-Info "-ValidateOnly detected. Exiting after azd preview."
            exit 0
        }

        if (-not $AutoApprove) {
            $confirmation = Read-Host "Continue with azd provision? (s/n)"
            if ($confirmation -ne "s" -and $confirmation -ne "S") {
                Write-Info "Deployment canceled by user"
                exit 0
            }
        }
        else {
            Write-Info "AutoApprove enabled. Continuing without interactive confirmation."
        }

        Write-Info "Running azd provision"
        Invoke-Azd -Args @("provision", "-e", $AzdEnvironment, "--no-prompt") | Out-Null
        Write-Success "azd provision finished"

        Write-Info "Refreshing azd environment values"
        Invoke-Azd -Args @("env", "refresh", "-e", $AzdEnvironment, "--no-prompt") | Out-Null

        if ($ShowAzdEnvValues) {
            Write-Header "AZD Environment Values"
            Invoke-Azd -Args @("env", "get-values", "-e", $AzdEnvironment, "--no-prompt") | ForEach-Object { Write-Host $_ }
        }

        Write-Header "Next Steps"
        Write-Host "1. Build and push Docker images"
        Write-Host "   .\scripts\build-and-push-images.ps1 -ResourceGroupName '$ResourceGroupName' -AzdEnvironment '$AzdEnvironment'"
        Write-Host "2. Update App Service images to your new tags"
        Write-Host "3. Verify App Service logs"
        Write-Host "   az webapp log tail -g '$ResourceGroupName' -n '<app-name>'"
    }
    catch {
        Write-ErrorMsg "AZD deployment failed: $_"
        exit 1
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptrAzd)
        Set-Location $previousLocation
    }

    Write-Success "Script finished"
    exit 0
}

# ============================================================================
# Validate Files and Bicep Syntax
# ============================================================================

Write-Header "Validate Bicep Files"

if (-not (Test-Path $MainBicepPath)) {
    Write-ErrorMsg "main.bicep not found at: $MainBicepPath"
    exit 1
}

Write-Success "main.bicep found: $MainBicepPath"

if (Test-Path $ParametersFile) {
    Write-WarningMsg "Parameters file found but it will not be injected automatically: $ParametersFile"
    Write-WarningMsg "If needed, map only compatible parameters into main.bicep first."
}
else {
    Write-WarningMsg "Parameters file not found: $ParametersFile (using defaults + inline overrides)"
}

try {
    Write-Info "Compiling main.bicep"
    $buildOutput = az bicep build --file $MainBicepPath 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ("Bicep build failed.`n" + ($buildOutput -join "`n"))
    }
    Write-Success "Bicep syntax is valid"
}
catch {
    Write-ErrorMsg "Bicep compile failed: $_"
    exit 1
}

# ============================================================================
# Deployment Validate
# ============================================================================

Write-Header "Validate Deployment Configuration"

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PostgresqlAdminPassword)
$PostgresqlAdminPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)

try {
    $commonArgs = Build-DeploymentArgs `
        -Rg $ResourceGroupName `
        -TemplateFile $MainBicepPath `
        -ParamsFile $ParametersFile `
        -Proj $ProjectName `
        -Env $EnvironmentName `
        -Loc $Location `
        -PgLoc $PostgresqlLocation `
        -DbPassword $PostgresqlAdminPasswordPlain

    Write-Info "Running validation"
    $validation = az deployment group validate @commonArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ("Deployment validation failed.`n" + ($validation -join "`n"))
    }

    Write-Success "Validation completed"
}
catch {
    Write-ErrorMsg "Validation failed: $_"
    Write-Host $validation
    exit 1
}

Write-Host ""
Write-Host "Deployment Summary:" -ForegroundColor Yellow
Write-Host "  Project: $ProjectName"
Write-Host "  Environment: $EnvironmentName"
Write-Host "  Resource Group: $ResourceGroupName"
Write-Host "  Location: $Location"
Write-Host "  PostgreSQL Location: $PostgresqlLocation"
Write-Host "  Template: $MainBicepPath"
Write-Host ""

if ($ValidateOnly) {
    Write-Info "-ValidateOnly detected. Exiting without deployment."
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    exit 0
}

if (-not $AutoApprove) {
    $confirmation = Read-Host "Continue with deployment? (s/n)"
    if ($confirmation -ne "s" -and $confirmation -ne "S") {
        Write-Info "Deployment canceled by user"
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        exit 0
    }
}
else {
    Write-Info "AutoApprove enabled. Continuing without interactive confirmation."
}

# ============================================================================
# Deployment Execute
# ============================================================================

Write-Header "Execute Deployment"

$deploymentName = "alumni-deploy-$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Info "Deployment name: $deploymentName"

try {
    $createArgs = @(
        "--name", $deploymentName
    ) + $commonArgs

    # Siempre crear en no-wait para evitar bloqueos y controlar el flujo de monitoreo.
    $createArgs += "--no-wait"

    $deploymentResult = az deployment group create @createArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ("Deployment create command failed.`n" + ($deploymentResult -join "`n"))
    }

    # Confirmar que el deployment existe antes de continuar.
    $probe = az deployment group show --resource-group $ResourceGroupName --name $deploymentName --query id -o tsv 2>&1
    if ($LASTEXITCODE -ne 0) {
        Start-Sleep -Seconds 8
        $probe = az deployment group show --resource-group $ResourceGroupName --name $deploymentName --query id -o tsv 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw ("Deployment was not created or not visible yet.`n" + ($probe -join "`n"))
        }
    }

    Write-Success "Deployment command sent"
}
catch {
    Write-ErrorMsg "Deployment failed: $_"
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    exit 1
}

# ============================================================================
# Wait for Completion (Optional)
# ============================================================================

if (-not $NoWait) {
    Write-Header "Monitor Deployment"

    Write-Info "Waiting for deployment completion"
    $waitOutput = az deployment group wait `
        --resource-group $ResourceGroupName `
        --name $deploymentName `
        --created `
        --interval 15 `
        --timeout 3600 `
        2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg ("Deployment wait failed.`n" + ($waitOutput -join "`n"))

        $stateAfterWait = az deployment group show `
            --resource-group $ResourceGroupName `
            --name $deploymentName `
            --query "properties.provisioningState" `
            -o tsv `
            2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-ErrorMsg "Deployment state after wait: $stateAfterWait"
        }

        $errorAfterWait = az deployment group show `
            --resource-group $ResourceGroupName `
            --name $deploymentName `
            --query "properties.error" `
            -o json `
            2>&1

        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace(($errorAfterWait -join ""))) {
            Write-ErrorMsg ("Deployment error details:`n" + ($errorAfterWait -join "`n"))
        }

        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        exit 1
    }

    $deploy = az deployment group show `
        --resource-group $ResourceGroupName `
        --name $deploymentName `
        | ConvertFrom-Json

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Could not fetch deployment status after wait"
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        exit 1
    }

    $state = $deploy.properties.provisioningState
    Write-Host "  State: $state $(Get-Date -Format 'HH:mm:ss')"

    if ($state -eq "Succeeded") {
        Write-Success "Deployment completed successfully"
    }
    elseif ($state -eq "Failed") {
        Write-ErrorMsg "Deployment failed"
        Write-ErrorMsg ($deploy.properties.error | ConvertTo-Json -Depth 10)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
        exit 1
    }
}

# ============================================================================
# Show Outputs
# ============================================================================

Write-Header "Deployment Outputs"

try {
    $outputs = az deployment group show `
        --resource-group $ResourceGroupName `
        --name $deploymentName `
        --query properties.outputs `
        | ConvertFrom-Json

    foreach ($key in ($outputs | Get-Member -MemberType NoteProperty).Name) {
        Write-Host "  $key = $($outputs.$key.value)"
    }
}
catch {
    Write-WarningMsg "Could not read deployment outputs: $_"
}

# ============================================================================
# Next Steps
# ============================================================================

Write-Header "Next Steps"
Write-Host "1. Build and push Docker images"
Write-Host "   .\scripts\build-and-push-images.ps1 -ResourceGroupName '$ResourceGroupName' -AcrName '<acr-name>'"
Write-Host "2. Run Django migrations in each backend container"
Write-Host "3. Verify App Service logs"
Write-Host "   az webapp log tail -g '$ResourceGroupName' -n '<app-name>'"

[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
Write-Success "Script finished"
