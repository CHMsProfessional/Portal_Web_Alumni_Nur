// ============================================================================
// MODULE: AZURE APP SERVICE PLAN (LINUX)
// ============================================================================

@description('Nombre del App Service Plan')
param appServicePlanName string

@description('Ubicación para el recurso')
param location string = resourceGroup().location

@description('SKU del App Service Plan')
@allowed([
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1V2'
  'P2V2'
  'P3V2'
])
param skuName string = 'B1'

@description('Número de instancias (workers)')
@minValue(1)
@maxValue(30)
param capacity int = 1

@description('Tags para los recursos')
param tags object = {}

// ============================================================================
// Crear App Service Plan para Linux
// ============================================================================

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: skuName
    capacity: capacity
    tier: getTierFromSku(skuName)
  }
  kind: 'linux'
  properties: {
    reserved: true
    isSpot: false
    elasticScaleEnabled: false
  }
}

// ============================================================================
// Funciones auxiliares
// ============================================================================

@export()
func getTierFromSku(sku string) string => sku == 'B1' || sku == 'B2' || sku == 'B3' ? 'Basic' : 
                                          sku == 'S1' || sku == 'S2' || sku == 'S3' ? 'Standard' : 
                                          'PremiumV2'

// ============================================================================
// Outputs
// ============================================================================

output appServicePlanId string = appServicePlan.id
output appServicePlanName string = appServicePlan.name
output appServicePlanSku string = appServicePlan.sku.name
output appServicePlanTier string = getTierFromSku(skuName)
output appServicePlanCapacity int = capacity
