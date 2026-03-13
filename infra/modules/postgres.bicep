// ============================================================================
// MODULE: AZURE DATABASE FOR POSTGRESQL FLEXIBLE SERVER
// ============================================================================

@description('Nombre del servidor PostgreSQL')
param postgresqlServerName string

@description('Ubicación para el recurso')
param location string = resourceGroup().location

@description('Usuario administrador de PostgreSQL')
param administratorLogin string = 'adminuser'

@description('Contraseña del usuario administrador')
@secure()
param administratorLoginPassword string

@description('Versión de PostgreSQL')
@allowed([
  '16'
  '15'
  '14'
  '13'
])
param postgresqlVersion string = '15'

@description('SKU de computación')
@allowed([
  'Standard_B1ms'
  'Standard_B2s'
  'Standard_D2s_v3'
  'Standard_D4s_v3'
])
param skuName string = 'Standard_B1ms'

@description('Almacenamiento en GB')
@minValue(32)
@maxValue(1024)
param storageSizeGB int = 32

@description('Nombre de la base de datos a crear')
param databaseName string = 'alumni_db'

@description('Habilitar backups geográficos redundantes')
param geoRedundantBackupEnabled bool = false

@description('Días de retención de backups')
@minValue(1)
@maxValue(35)
param backupRetentionDays int = 7

@description('Permitir acceso público (ADVERTENCIA: NO recomendado para producción)')
param publicNetworkAccessEnabled bool = false

@description('Requiere conexión TLS')
param requireSecureTransport bool = true

@description('Versión mínima de TLS')
param minimumTlsVersion string = 'TLSEnforced'

@description('Tags para los recursos')
param tags object = {}

// ============================================================================
// Crear Azure Database for PostgreSQL Flexible Server
// ============================================================================

resource postgresqlServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01' = {
  name: postgresqlServerName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: contains(skuName, 'Standard_B') ? 'Burstable' : 'GeneralPurpose'
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: postgresqlVersion
    storage: {
      storageSizeGB: storageSizeGB
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: geoRedundantBackupEnabled ? 'Enabled' : 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: '' // Vacío para acceso público
      privateDnsZoneArmResourceId: null
    }
    highAvailability: {
      mode: 'Disabled' // Deshabilitado para demostración
    }
    lifecycleManagement: {
      autoVacuumEnabled: true
    }
  }
}

// ============================================================================
// Configurar reglas de firewall para acceso público
// ============================================================================

resource firewallRuleAllowAll 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01' = if (publicNetworkAccessEnabled) {
  parent: postgresqlServer
  name: 'AllowAllIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

// ============================================================================
// Crear base de datos inicial
// ============================================================================

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01' = {
  parent: postgresqlServer
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ============================================================================
// Configuraciones PostgreSQL
// ============================================================================

resource postgresqlConfig_LogConnections 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01' = {
  parent: postgresqlServer
  name: 'log_connections'
  properties: {
    value: 'on'
    source: 'user-override'
  }
}

resource postgresqlConfig_LogStatement 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01' = {
  parent: postgresqlServer
  name: 'log_statement'
  properties: {
    value: 'all'
    source: 'user-override'
  }
}

resource postgresqlConfig_SharedPreloadLibraries 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-12-01' = {
  parent: postgresqlServer
  name: 'shared_preload_libraries'
  properties: {
    value: 'pgaudit'
    source: 'user-override'
  }
}

// ============================================================================
// Outputs
// ============================================================================

output postgresqlServerId string = postgresqlServer.id
output postgresqlServerName string = postgresqlServer.name
output postgresqlFqdn string = postgresqlServer.properties.fullyQualifiedDomainName
output postgresqlAdminUsername string = administratorLogin
output databaseName string = database.name
output postgresqlConnectionString string = 'postgresql://${administratorLogin}:@${postgresqlServer.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=${requireSecureTransport ? 'require' : 'prefer'}'
output postgresqlConnectionStringWithPassword string = 'postgresql://${administratorLogin}:<PASSWORD>@${postgresqlServer.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=${requireSecureTransport ? 'require' : 'prefer'}'
output postgresqlPort int = 5432
