// ============================================================================
// MODULE: AZURE APP SERVICE (LINUX CONTAINERS)
// ============================================================================

@description('Nombre del App Service')
param appServiceName string

@description('Nombre del App Service Plan (debe existir previamente)')
param appServicePlanId string

@description('Ubicación para el recurso')
param location string = resourceGroup().location

@description('Nombre de la imagen Docker a desplegar')
param dockerImageName string

@description('Puerto interno de la aplicación')
@minValue(1)
@maxValue(65535)
param containerPort int = 8000

@description('CORS: Orígenes permitidos (separados por coma)')
param corsAllowedOrigins array = []

@description('Variables de entorno para la aplicación')
param environmentVariables object = {}

@description('ACR Username para autenticación')
param acrUsername string = ''

@description('ACR Password para autenticación')
@secure()
param acrPassword string = ''

@description('ACR Login Server')
param acrLoginServer string = ''

@description('Habilitar siempre activado (App Service siempre en ejecución)')
param alwaysOn bool = true

@description('HTTP/2 habilitado')
param http2Enabled bool = true

@description('FTPS estado (Disabled, FtpsOnly, AllAllowed)')
param ftpsState string = 'FtpsOnly'

@description('Tags para los recursos')
param tags object = {}

// ============================================================================
// Crear App Service
// ============================================================================

resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    reserved: true
    isXenonStack: false
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${dockerImageName}'
      alwaysOn: alwaysOn
      http20Enabled: http2Enabled
      ftpsState: ftpsState
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      appSettings: concat(
        [
          {
            name: 'DOCKER_REGISTRY_SERVER_USERNAME'
            value: acrUsername
            slotSetting: false
          }
          {
            name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
            value: acrPassword
            slotSetting: false
          }
          {
            name: 'DOCKER_REGISTRY_SERVER_URL'
            value: 'https://${acrLoginServer}'
            slotSetting: false
          }
          {
            name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
            value: 'false'
            slotSetting: false
          }
          {
            name: 'WEBSITES_PORT'
            value: string(containerPort)
            slotSetting: false
          }
          {
            name: 'WEBSITE_ADD_SITENAME_BINDINGS_JSON'
            value: 'true'
            slotSetting: false
          }
        ],
        [for key in items(environmentVariables): {
          name: key.key
          value: key.value
          slotSetting: false
        }]
      )
      cors: {
        allowedOrigins: empty(corsAllowedOrigins) ? ['*'] : corsAllowedOrigins
        supportCredentials: true
      }
      numberOfWorkers: 1
      defaultDocuments: []
      netFrameworkVersion: 'v4.0'
      requestTracingEnabled: false
      remoteDebuggingEnabled: false
      httpLoggingEnabled: true
      detailedErrorLoggingEnabled: true
      publishingUsername: appServiceName
      scmType: 'None'
      use32BitWorkerProcess: false
      managedPipelineMode: 'Integrated'
      virtualApplications: [
        {
          virtualPath: '/'
          physicalPath: 'site\\wwwroot'
        }
      ]
      loadBalancing: 'LeastRequests'
      experiments: {
        rampUpRules: []
      }
      autoHealEnabled: true
      autoHealRules: {
        triggers: {
          statusCodes: [
            {
              status: 500
              subStatus: 0
              count: 10
              timeInterval: '00:01:00'
            }
          ]
        }
        actions: {
          actionType: 'Recycle'
          minProcessExecutionTime: '00:01:00'
        }
      }
      localMySqlEnabled: false
      ipSecurityRestrictions: [
        {
          ipAddress: 'Any'
          action: 'Allow'
          priority: 1
          name: 'Allow all'
          description: 'Allow all access'
        }
      ]
      scmIpSecurityRestrictions: [
        {
          ipAddress: 'Any'
          action: 'Allow'
          priority: 1
          name: 'Allow all'
          description: 'Allow all access'
        }
      ]
    }
    clientAffinityEnabled: false
    clientCertEnabled: false
    hostNamesDisabled: false
    containerSize: 0
    dailyMemoryTimeQuota: 0
    keyVaultReferenceIdentity: 'SystemAssigned'
  }

  dependsOn: []
}

// ============================================================================
// Configurar HTTPS binding
// ============================================================================

resource appServiceBinding 'Microsoft.Web/sites/hostNameBindings@2023-12-01' = {
  parent: appService
  name: appService.properties.defaultHostName
  properties: {
    siteName: appServiceName
    hostNameType: 'Verified'
  }
}

// ============================================================================
// Logs de diagnóstico
// ============================================================================

resource appServiceLogs 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: appService
  name: 'logs'
  properties: {
    applicationLogs: {
      fileSystemLevel: 'Verbose'
      azureBlobStorage: null
    }
    httpLogs: {
      fileSystem: {
        retentionInDays: 7
        enabled: true
      }
      azureBlobStorage: null
    }
    failedRequestsTracing: {
      enabled: true
    }
    detailedErrorMessages: {
      enabled: true
    }
  }
}

// ============================================================================
// Outputs
// ============================================================================

output appServiceId string = appService.id
output appServiceName string = appService.name
output appServiceDefaultHostname string = appService.properties.defaultHostName
output appServiceUrl string = 'https://${appService.properties.defaultHostName}'
output appServicePrincipalId string = appService.identity.principalId
output appServiceTenantId string = appService.identity.tenantId
