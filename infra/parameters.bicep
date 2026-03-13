// ============================================================================
// PARAMETERS.BICEP - Parámetros de entrada para la solución
// ============================================================================

// ============================================================================
// Parámetros Básicos - REQUERIDOS
// ============================================================================

@description('Nombre del proyecto (será usado en todos los nombres de recursos)')
@minLength(3)
@maxLength(15)
param projectName string

@description('Ambiente de despliegue: dev, staging, o prod')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'dev'

@description('Región Azure donde desplegar (ej: eastus, westus2)')
@allowed([
  'eastus'
  'eastus2'
  'westus'
  'westus2'
  'westus3'
  'northeurope'
  'westeurope'
])
param location string = 'eastus'

// ============================================================================
// Parámetros de Base de Datos PostgreSQL
// ============================================================================

@description('Usuario administrador de PostgreSQL')
@minLength(1)
@maxLength(63)
param postgresqlAdminUsername string = 'adminuser'

@description('Contraseña del usuario administrador de PostgreSQL (min 8 caracteres, debe incluir mayúsculas, minúsculas, números y símbolos)')
@minLength(8)
@maxLength(128)
@secure()
param postgresqlAdminPassword string

@description('Versión de PostgreSQL')
@allowed([
  '16'
  '15'
  '14'
  '13'
])
param postgresqlVersion string = '15'

@description('Número de vCPUs para PostgreSQL (SKU)')
@allowed([
  'Standard_B1ms'
  'Standard_B2s'
  'Standard_D2s_v3'
])
param postgresqlSku string = 'Standard_B1ms'

@description('Almacenamiento en GB para PostgreSQL')
@minValue(32)
@maxValue(1024)
param postgresqlStorageGB int = 32

// ============================================================================
// Parámetros de Redis Cache
// ============================================================================

@description('Capacidad de Redis (0-6, donde 0=250MB, 1=1GB, 2=2.5GB, etc.)')
@minValue(0)
@maxValue(6)
param redisCapacity int = 0

@description('SKU de Redis (Basic, Standard, Premium)')
@allowed([
  'Basic'
  'Standard'
  'Premium'
])
param redisSku string = 'Basic'

@description('Familia de SKU para Redis (C=Basic, P=Premium)')
@allowed([
  'C'
  'P'
])
param redisFamily string = 'C'

@description('Permitir acceso solo desde VNet (recomendado para producción)')
param redisRequireSecureTransport bool = true

// ============================================================================
// Parámetros de App Service
// ============================================================================

@description('SKU del App Service Plan')
@allowed([
  'B1'  // Basic (más económico para dev)
  'B2'  // Basic
  'S1'  // Standard
  'S2'  // Standard
  'P1V2' // Premium
])
param appServiceSkuName string = 'B1'

@description('Número de instancias del App Service Plan')
@minValue(1)
@maxValue(10)
param appServiceInstanceCount int = 1

// ============================================================================
// Parámetros de Imágenes Docker
// ============================================================================

@description('Tag de imagen Docker para Alumni API')
param alumniApiImageTag string = 'latest'

@description('Tag de imagen Docker para Content API')
param contentApiImageTag string = 'latest'

// ============================================================================
// Parámetros de Frontend (Static Web App)
// ============================================================================

@description('SKU de Static Web App')
@allowed([
  'Free'
  'Standard'
])
param staticWebAppSku string = 'Free'

@description('URL de repositorio del frontend React (GitHub)')
param repositoryUrl string = ''

@description('Rama del repositorio (si usa GitHub deployment)')
param repositoryBranch string = 'main'

// ============================================================================
// Parámetros de Etiquetado
// ============================================================================

@description('Etiquetas adicionales a aplicar a todos los recursos')
param additionalTags object = {}

@description('Nombre del equipo/departamento propietario de los recursos')
param ownerName string = 'Engineering'

@description('Correo de contacto para los recursos')
param ownerEmail string = 'contact@example.com'

@description('Centro de costos para facturación')
param costCenter string = 'CC-001'

// ============================================================================
// Parámetros Avanzados (Opcionales)
// ============================================================================

@description('Habilitar alertas de monitoreo y logs')
param enableMonitoring bool = true

@description('Habilitar Application Insights para App Services')
param enableApplicationInsights bool = (environment != 'dev') ? true : false

@description('Días de retención de logs (máximo 730)')
@minValue(1)
@maxValue(730)
param logRetentionDays int = (environment == 'prod') ? 90 : 30

@description('Habilitar backups automáticos de PostgreSQL')
param enableDatabaseBackup bool = (environment != 'dev') ? true : false

@description('Días de retención para backups de PostgreSQL')
@minValue(1)
@maxValue(35)
param databaseBackupRetentionDays int = (environment == 'prod') ? 35 : 7

@description('Permitir acceso público a PostgreSQL (NO recomendado para producción)')
param postgresqlAllowPublicAccess bool = (environment == 'dev') ? true : false
