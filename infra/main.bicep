targetScope = 'resourceGroup'

@description('Project name prefix used in resource names.')
param projectName string

@description('Environment name, for example dev, qa, prod.')
@allowed([
  'dev'
  'qa'
  'prod'
])
param environment string = 'dev'

@description('Alternative environment name parameter for azd compatibility. If empty, uses environment.')
@allowed([
  ''
  'dev'
  'qa'
  'prod'
])
param environmentName string = ''

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Azure region for PostgreSQL Flexible Server. Use a region enabled for your subscription offer.')
param postgresqlLocation string = 'centralus'

@description('Azure region for Static Web App. Use a supported region such as eastus2 or westeurope.')
param staticWebAppLocation string = 'eastus2'

@description('PostgreSQL administrator username.')
param postgresqlAdminUsername string = 'pgadmin'

@description('PostgreSQL administrator password.')
@secure()
param postgresqlAdminPassword string

@description('Container image tag for Alumni API.')
param alumniApiImageTag string = 'latest'

@description('Container image tag for Content API.')
param contentApiImageTag string = 'latest'

@description('Port exposed by Alumni API container.')
param alumniApiPort int = 8000

@description('Port exposed by Content API container.')
param contentApiPort int = 8001

@description('App Service SKU (demo: B1).')
param appServicePlanSku string = 'B1'

@description('PostgreSQL sku name.')
param postgresqlSkuName string = 'Standard_B1ms'

@description('PostgreSQL storage in GB.')
@minValue(32)
param postgresqlStorageGb int = 32

@description('Redis SKU family (Basic/Standard: C, Premium: P).')
@allowed([
  'C'
  'P'
])
param redisFamily string = 'C'

@description('Redis SKU tier.')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param redisSkuName string = 'Basic'

@description('Redis capacity (Basic C0: 0, Basic C1: 1).')
@minValue(0)
@maxValue(6)
param redisCapacity int = 0

@description('When true, applies infrastructure and runtime configuration changes (Redis, ACR, PostgreSQL, Static Web App, app settings).')
param applyInfrastructureChanges bool = false

@description('When true, updates App Service container image tags for backend APIs.')
param applyImageChanges bool = false

var effectiveEnvironment = empty(environmentName) ? environment : environmentName

var suffix = toLower(uniqueString(subscription().id, resourceGroup().id, projectName, effectiveEnvironment))
var base = toLower('${projectName}-${effectiveEnvironment}')
var postgresSuffix = toLower(uniqueString(subscription().id, resourceGroup().id, projectName, effectiveEnvironment, postgresqlLocation))

var acrName = take(replace('${projectName}${effectiveEnvironment}${suffix}', '-', ''), 50)
var planName = take('asp-${base}-${suffix}', 40)
var alumniApiName = take('app-${base}-alumni-${suffix}', 60)
var contentApiName = take('app-${base}-content-${suffix}', 60)
var postgresServerName = take('psql-${base}-${postgresSuffix}', 63)
var postgresDbName = 'alumni'
var redisName = take('redis-${base}-${suffix}', 63)
var staticWebAppName = take('swa-${base}-${suffix}', 40)

var tags = {
  project: projectName
  environment: effectiveEnvironment
  managedBy: 'bicep'
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = if (applyInfrastructureChanges) {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = if (applyInfrastructureChanges) {
  name: planName
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: appServicePlanSku
    tier: startsWith(appServicePlanSku, 'B') ? 'Basic' : 'Standard'
    capacity: 1
  }
  properties: {
    reserved: true
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = if (applyInfrastructureChanges) {
  name: postgresServerName
  location: postgresqlLocation
  tags: tags
  sku: {
    name: postgresqlSkuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresqlAdminUsername
    administratorLoginPassword: postgresqlAdminPassword
    version: '16'
    storage: {
      storageSizeGB: postgresqlStorageGb
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = if (applyInfrastructureChanges) {
  name: '${postgres.name}/${postgresDbName}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = if (applyInfrastructureChanges) {
  name: '${postgres.name}/AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource redis 'Microsoft.Cache/Redis@2023-08-01' = if (applyInfrastructureChanges) {
  name: redisName
  location: location
  tags: tags
  properties: {
    sku: {
      family: redisFamily
      name: redisSkuName
      capacity: redisCapacity
    }
    enableNonSslPort: true
    minimumTlsVersion: '1.2'
    redisConfiguration: {}
  }
}

resource acrExisting 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acrName
}

resource appServicePlanExisting 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: planName
}

resource postgresExisting 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' existing = {
  name: postgresServerName
}

resource redisExisting 'Microsoft.Cache/Redis@2023-08-01' existing = {
  name: redisName
}

resource staticWebAppExisting 'Microsoft.Web/staticSites@2023-12-01' existing = {
  name: staticWebAppName
}

var acrLoginServer = reference(applyInfrastructureChanges ? acr.id : acrExisting.id, '2023-07-01').loginServer
var appServicePlanId = applyInfrastructureChanges ? appServicePlan.id : appServicePlanExisting.id
var postgresHost = '${applyInfrastructureChanges ? postgres.name : postgresExisting.name}.postgres.database.azure.com'
var redisHostName = reference(applyInfrastructureChanges ? redis.id : redisExisting.id, '2023-08-01').hostName
var acrCreds = listCredentials(applyInfrastructureChanges ? acr.id : acrExisting.id, '2023-07-01')
var redisKeys = listKeys(applyInfrastructureChanges ? redis.id : redisExisting.id, '2023-08-01')
var postgresConn = 'postgresql://${postgresqlAdminUsername}:${postgresqlAdminPassword}@${postgresHost}:5432/${postgresDbName}?sslmode=require'
var redisConn = 'rediss://:${redisKeys.primaryKey}@${redisHostName}:6380/0'
var djangoAllowedHostsAlumni = '${alumniApiName}.azurewebsites.net,localhost,127.0.0.1'
var djangoAllowedHostsContent = '${contentApiName}.azurewebsites.net,localhost,127.0.0.1'

resource alumniApi 'Microsoft.Web/sites@2023-12-01' = if (applyImageChanges) {
  name: alumniApiName
  location: location
  tags: tags
  kind: 'app,linux,container'
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/alma-api:${alumniApiImageTag}'
    }
  }
}

resource alumniApiAppSettings 'Microsoft.Web/sites/config@2023-12-01' = if (applyInfrastructureChanges) {
  name: '${alumniApiName}/appsettings'
  properties: {
    WEBSITES_PORT: string(alumniApiPort)
    WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false'
    DOCKER_REGISTRY_SERVER_URL: 'https://${acrLoginServer}'
    DOCKER_REGISTRY_SERVER_USERNAME: acrCreds.username
    DOCKER_REGISTRY_SERVER_PASSWORD: acrCreds.passwords[0].value
    DJANGO_SETTINGS_MODULE: 'AlumniAPI.settings'
    DJANGO_DEBUG: 'False'
    DJANGO_ALLOWED_HOSTS: djangoAllowedHostsAlumni
    DB_NAME: postgresDbName
    DB_USER: postgresqlAdminUsername
    DB_PASSWORD: postgresqlAdminPassword
    DB_HOST: postgresHost
    DB_PORT: '5432'
    PGSSLMODE: 'require'
    DATABASE_URL: postgresConn
    REDIS_URL: redisConn
    CORS_ALLOWED_ORIGINS: 'https://${staticWebAppExisting.properties.defaultHostname}'
    DJANGO_ALLOWED_ORIGINS: 'https://${staticWebAppExisting.properties.defaultHostname}'
  }
}

resource contentApi 'Microsoft.Web/sites@2023-12-01' = if (applyImageChanges) {
  name: contentApiName
  location: location
  tags: tags
  kind: 'app,linux,container'
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acrLoginServer}/content-api:${contentApiImageTag}'
    }
  }
}

resource contentApiAppSettings 'Microsoft.Web/sites/config@2023-12-01' = if (applyInfrastructureChanges) {
  name: '${contentApiName}/appsettings'
  properties: {
    WEBSITES_PORT: string(contentApiPort)
    WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false'
    DOCKER_REGISTRY_SERVER_URL: 'https://${acrLoginServer}'
    DOCKER_REGISTRY_SERVER_USERNAME: acrCreds.username
    DOCKER_REGISTRY_SERVER_PASSWORD: acrCreds.passwords[0].value
    DJANGO_SETTINGS_MODULE: 'ContenidoAlumniApi.settings'
    DJANGO_DEBUG: 'False'
    DJANGO_ALLOWED_HOSTS: djangoAllowedHostsContent
    DB_NAME: postgresDbName
    DB_USER: postgresqlAdminUsername
    DB_PASSWORD: postgresqlAdminPassword
    DB_HOST: postgresHost
    DB_PORT: '5432'
    PGSSLMODE: 'require'
    REDIS_HOST: redisHostName
    REDIS_PORT: '6379'
    DATABASE_URL: postgresConn
    REDIS_URL: redisConn
    ACCESS_API_URL: 'https://${alumniApiName}.azurewebsites.net/api/'
    CORS_ALLOWED_ORIGINS: 'https://${staticWebAppExisting.properties.defaultHostname}'
    DJANGO_ALLOWED_ORIGINS: 'https://${staticWebAppExisting.properties.defaultHostname}'
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = if (applyInfrastructureChanges) {
  name: staticWebAppName
  location: staticWebAppLocation
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: ''
    branch: ''
    buildProperties: {
      appLocation: '/'
      outputLocation: 'dist'
    }
    stagingEnvironmentPolicy: 'Enabled'
  }
}

output resourceGroupName string = resourceGroup().name
output containerRegistryName string = acrName
output containerRegistryLoginServer string = acrLoginServer
output appServicePlanName string = planName
output alumniApiAppName string = alumniApiName
output alumniApiUrl string = 'https://${alumniApiName}.azurewebsites.net'
output contentApiAppName string = contentApiName
output contentApiUrl string = 'https://${contentApiName}.azurewebsites.net'
output staticWebAppNameOut string = staticWebAppName
output staticWebAppUrl string = 'https://${staticWebAppExisting.properties.defaultHostname}'
output postgresqlServerName string = postgresServerName
output postgresqlDatabaseName string = '${postgresServerName}/${postgresDbName}'
output redisNameOut string = redisName
output redisHost string = redisHostName
