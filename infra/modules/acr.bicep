// ============================================================================
// MODULE: AZURE CONTAINER REGISTRY (ACR)
// ============================================================================

@description('Nombre del Container Registry')
param acrName string

@description('Ubicación para el recurso')
param location string = resourceGroup().location

@description('SKU del Container Registry')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param acrSku string = 'Basic'

@description('Habilitar acceso administrativo')
param acrAdminUserEnabled bool = true

@description('Habilitar regla de eliminación de imágenes innecesarias')
param acrEnablePurge bool = false

@description('Tags para los recursos')
param tags object = {}

// ============================================================================
// Crear Azure Container Registry
// ============================================================================

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: acrAdminUserEnabled
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    anonymousSourceIP: ''
    dataEndpointEnabled: false
    dataEndpointHostNames: []
  }
}

// ============================================================================
// Obtener credenciales de acceso
// ============================================================================

resource acrCredentials 'Microsoft.ContainerRegistry/registries/listCredentials@2023-11-01-preview' = {
  parent: containerRegistry
  name: 'credentials'
}

// ============================================================================
// Outputs
// ============================================================================

output acrId string = containerRegistry.id
output acrName string = containerRegistry.name
output acrLoginServer string = containerRegistry.properties.loginServer
output acrAdminUsername string = acrCredentials.listCredentialsResult.username ?? ''
@secure()
output acrAdminPassword string = acrCredentials.listCredentialsResult.passwords[0].value ?? ''
output acrRegistryUrl string = 'https://${containerRegistry.properties.loginServer}'
