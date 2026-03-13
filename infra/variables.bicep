// ============================================================================
// VARIABLES.BICEP - Valores calculados y convenciones de nombrado
// ============================================================================

var location = resourceGroup().location
var environmentLower = toLower(environment)
var resourceGroupName = resourceGroup().name

// ============================================================================
// Convenciones de Nombres Azure (Naming Conventions)
// Formato: {resource-type-abbreviation}-{project}-{environment}-{uniqueSuffix}
// ============================================================================

var nameAbbreviations = {
  acr: 'acr'
  appService: 'app'
  appServicePlan: 'plan'
  postgresqlServer: 'psql'
  postgresqlDatabase: 'db'
  redisCache: 'redis'
  staticWebApp: 'swa'
  keyVault: 'kv'
  vnet: 'vnet'
  subnet: 'subnet'
  nsg: 'nsg'
}

// Generar sufijo único basado en el nombre del resource group
var uniqueSuffix = substring(uniqueString(resourceGroup().id), 0, 5)

// Nombres de recursos con convención Azure
var acrName = '${nameAbbreviations.acr}${projectName}${environmentLower}${uniqueSuffix}'
var appServicePlanName = '${nameAbbreviations.appServicePlan}-${projectName}-${environmentLower}'
var appServiceAlumniApiName = '${nameAbbreviations.appService}-alumni-api-${environmentLower}-${uniqueSuffix}'
var appServiceContentApiName = '${nameAbbreviations.appService}-content-api-${environmentLower}-${uniqueSuffix}'
var postgresqlServerName = '${nameAbbreviations.postgresqlServer}-${projectName}-${environmentLower}-${uniqueSuffix}'
var postgresqlDatabaseName = 'alumni_db'
var redisCacheName = '${nameAbbreviations.redisCache}-${projectName}-${environmentLower}-${uniqueSuffix}'
var staticWebAppName = '${nameAbbreviations.swa}-${projectName}-${environmentLower}-${uniqueSuffix}'
var keyVaultName = '${nameAbbreviations.keyVault}${projectName}${environmentLower}${uniqueSuffix}'

// ============================================================================
// Configuración de Imágenes Docker
// ============================================================================

var acrLoginServer = '${acrName}.azurecr.io'
var alumniApiImageName = '${acrLoginServer}/${projectName}/alumni-api:latest'
var contentApiImageName = '${acrLoginServer}/${projectName}/content-api:latest'

// ============================================================================
// Configuración de App Service
// ============================================================================

var linuxFxVersion = 'DOCKER|${acrLoginServer}/${projectName}/alumni-api:latest'
var appServicePortAlumni = 8080
var appServicePortContent = 8081
var appServiceAlwaysOn = (environment == 'prod' || environment == 'staging') ? true : false

// ============================================================================
// Configuración de PostgreSQL
// ============================================================================

var postgresqlSkuName = 'Standard_B1ms' // Para demostración
var postgresqlStorageGB = 32
var postgresqlBackupRetentionDays = 7
var postgresqlGeoRedundantBackup = 'Disabled' // Para demostración

// ============================================================================
// Configuración de Redis
// ============================================================================

var redisSkuName = 'Basic' // Para demostración
var redisCapacity = 0 // Basic 0 = 250MB
var redisFamily = 'C'

// ============================================================================
// Tags para todos los recursos
// ============================================================================

var commonTags = {
  project: projectName
  environment: environment
  createdBy: 'Bicep'
  createdDate: utcNow('yyyy-MM-dd')
  solution: 'Alumni-Portal'
}

// ============================================================================
// Configuración de Networking
// ============================================================================

var vnetName = '${nameAbbreviations.vnet}-${projectName}-${environmentLower}'
var vnetAddressSpace = '10.0.0.0/16'
var subnetAppServiceName = 'subnet-app-service'
var subnetAppServiceAddressPrefix = '10.0.1.0/24'
var subnetDatabaseName = 'subnet-database'
var subnetDatabaseAddressPrefix = '10.0.2.0/24'

// ============================================================================
// Salidas calculadas (para referencia en main.bicep)
// ============================================================================

output calculatedValues object = {
  location: location
  acrName: acrName
  acrLoginServer: acrLoginServer
  appServicePlanName: appServicePlanName
  appServiceAlumniApiName: appServiceAlumniApiName
  appServiceContentApiName: appServiceContentApiName
  postgresqlServerName: postgresqlServerName
  postgresqlDatabaseName: postgresqlDatabaseName
  redisCacheName: redisCacheName
  staticWebAppName: staticWebAppName
  keyVaultName: keyVaultName
  uniqueSuffix: uniqueSuffix
  commonTags: commonTags
}
