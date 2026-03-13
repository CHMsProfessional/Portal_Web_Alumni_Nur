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

var suffix = toLower(uniqueString(subscription().id, resourceGroup().id, projectName, environment))
var base = toLower('${projectName}-${environment}')
var postgresSuffix = toLower(uniqueString(subscription().id, resourceGroup().id, projectName, environment, postgresqlLocation))

var acrName = take(replace('${projectName}${environment}${suffix}', '-', ''), 50)
var planName = take('asp-${base}-${suffix}', 40)
var alumniApiName = take('app-${base}-alumni-${suffix}', 60)
var contentApiName = take('app-${base}-content-${suffix}', 60)
var postgresServerName = take('psql-${base}-${postgresSuffix}', 63)
var postgresDbName = 'alumni'
var redisName = take('redis-${base}-${suffix}', 63)
var staticWebAppName = take('swa-${base}-${suffix}', 40)

var tags = {
  project: projectName
  environment: environment
  managedBy: 'bicep'
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
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

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
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

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
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

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  name: '${postgres.name}/${postgresDbName}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource postgresFirewallAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  name: '${postgres.name}/AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource redis 'Microsoft.Cache/Redis@2023-08-01' = {
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

var acrCreds = listCredentials(acr.id, '2023-07-01')
var redisKeys = listKeys(redis.id, '2023-08-01')
var postgresHost = '${postgres.name}.postgres.database.azure.com'
var postgresConn = 'postgresql://${postgresqlAdminUsername}:${postgresqlAdminPassword}@${postgresHost}:5432/${postgresDbName}?sslmode=require'
var redisConn = 'rediss://:${redisKeys.primaryKey}@${redis.properties.hostName}:6380/0'
var djangoAllowedHostsAlumni = '${alumniApi.properties.defaultHostName},localhost,127.0.0.1'
var djangoAllowedHostsContent = '${contentApi.properties.defaultHostName},localhost,127.0.0.1'

resource alumniApi 'Microsoft.Web/sites@2023-12-01' = {
  name: alumniApiName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/alma-api:${alumniApiImageTag}'
      acrUseManagedIdentityCreds: false
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

resource alumniApiAppSettings 'Microsoft.Web/sites/config@2023-12-01' = {
  name: '${alumniApi.name}/appsettings'
  properties: {
    WEBSITES_PORT: string(alumniApiPort)
    WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false'
    DOCKER_REGISTRY_SERVER_URL: 'https://${acr.properties.loginServer}'
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
    CORS_ALLOWED_ORIGINS: 'https://${staticWebAppName}.azurestaticapps.net'
    DJANGO_ALLOWED_ORIGINS: 'https://${staticWebAppName}.azurestaticapps.net'
  }
  dependsOn: [
    alumniApi
    acr
    postgres
    redis
    staticWebApp
  ]
}

resource contentApi 'Microsoft.Web/sites@2023-12-01' = {
  name: contentApiName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/content-api:${contentApiImageTag}'
      acrUseManagedIdentityCreds: false
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
  }
}

resource contentApiAppSettings 'Microsoft.Web/sites/config@2023-12-01' = {
  name: '${contentApi.name}/appsettings'
  properties: {
    WEBSITES_PORT: string(contentApiPort)
    WEBSITES_ENABLE_APP_SERVICE_STORAGE: 'false'
    DOCKER_REGISTRY_SERVER_URL: 'https://${acr.properties.loginServer}'
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
    REDIS_HOST: redis.properties.hostName
    REDIS_PORT: '6379'
    DATABASE_URL: postgresConn
    REDIS_URL: redisConn
    ACCESS_API_URL: 'https://${alumniApi.properties.defaultHostName}/api/'
    CORS_ALLOWED_ORIGINS: 'https://${staticWebAppName}.azurestaticapps.net'
    DJANGO_ALLOWED_ORIGINS: 'https://${staticWebAppName}.azurestaticapps.net'
  }
  dependsOn: [
    contentApi
    acr
    postgres
    redis
    staticWebApp
  ]
}

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
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
output containerRegistryName string = acr.name
output containerRegistryLoginServer string = acr.properties.loginServer
output appServicePlanName string = appServicePlan.name
output alumniApiAppName string = alumniApi.name
output alumniApiUrl string = 'https://${alumniApi.properties.defaultHostName}'
output contentApiAppName string = contentApi.name
output contentApiUrl string = 'https://${contentApi.properties.defaultHostName}'
output staticWebAppNameOut string = staticWebApp.name
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output postgresqlServerName string = postgres.name
output postgresqlDatabaseName string = postgresDb.name
output redisNameOut string = redis.name
output redisHost string = redis.properties.hostName
