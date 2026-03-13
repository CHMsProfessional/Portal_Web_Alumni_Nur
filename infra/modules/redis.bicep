// ============================================================================
// MODULE: AZURE CACHE FOR REDIS
// ============================================================================

@description('Nombre del Redis Cache')
param redisCacheName string

@description('Ubicación para el recurso')
param location string = resourceGroup().location

@description('SKU de Redis (Basic, Standard, Premium)')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param redisSku string = 'Basic'

@description('Capacidad (0-6 para Basic/Standard, 1-5 para Premium)')
@minValue(0)
@maxValue(6)
param capacity int = 0

@description('Familia de SKU (C para Basic/Standard, P para Premium)')
param family string = 'C'

@description('Versión de Redis')
@allowed([
  '4'
  '6'
  '7'
])
param redisVersion string = '7'

@description('Requerir transporte seguro (TLS)')
param requireSecureTransport bool = true

@description('Mínima versión de TLS')
@allowed([
  '1.0'
  '1.1'
  '1.2'
])
param minimumTlsVersion string = '1.2'

@description('Zona de disponibilidad (solo Premium)')
param zones array = []

@description('Tags para los recursos')
param tags object = {}

// ============================================================================
// Crear Azure Cache for Redis
// ============================================================================

resource redisCache 'Microsoft.Cache/redis@2024-04-01' = {
  name: redisCacheName
  location: location
  tags: tags
  zones: empty(zones) ? null : zones
  properties: {
    sku: {
      name: redisSku
      family: family
      capacity: capacity
    }
    enableNonSslPort: false
    minimumTlsVersion: minimumTlsVersion
    tenantSettings: {
      'bgsave-enabled': 'false' // Deshabilitado para evitar picos de uso
    }
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru' // Política de evicción: eliminar claves menos usadas
    }
  }
}

// ============================================================================
// Obtener claves de acceso
// ============================================================================

resource redisAccessKeys 'Microsoft.Cache/redis/listKeys@2024-04-01' = {
  parent: redisCache
  name: 'default'
}

// ============================================================================
// Outputs
// ============================================================================

output redisId string = redisCache.id
output redisName string = redisCache.name
output redisPrimaryEndpoint string = redisCache.properties.hostName
output redisPrimaryPort int = 6379
output redisAccessKey string = redisAccessKeys.listKeysResult.primaryKey
output redisConnectionString string = '${redisCache.properties.hostName}:6379,password=${redisAccessKeys.listKeysResult.primaryKey},ssl=True,abortConnect=False'
output redisSecondaryAccessKey string = redisAccessKeys.listKeysResult.secondaryKey
output redisFullyQualifiedDomainName string = redisCache.properties.hostName
