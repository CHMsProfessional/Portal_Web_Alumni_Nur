// ============================================================================
// MODULE: AZURE STATIC WEB APPS
// ============================================================================

@description('Nombre del Static Web App')
param staticWebAppName string

@description('Ubicación para el recurso (debe ser centralus, westcentralus, etc.)')
param location string = 'centralus'

@description('SKU del Static Web App')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

@description('URL del repositorio (ej: https://github.com/usuario/repo)')
param repositoryUrl string = ''

@description('Token de autenticación GitHub (si es público, puede ser opcional)')
@secure()
param repositoryToken string = ''

@description('Rama del repositorio a desplegar')
param repositoryBranch string = 'main'

@description('Ruta de la aplicación en el repositorio')
param appLocation string = 'FrontendAlumni'

@description('Ruta de la salida de compilación')
param outputLocation string = 'dist'

@description('Ruta del archivo de configuración de compilación')
param appBuildCommand string = 'npm run build'

@description('Habilitar acceso compartido para pull requests')
param allowConfigFileUpdates bool = false

@description('Tags para los recursos')
param tags object = {}

// ============================================================================
// Crear Static Web App
// ============================================================================

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    provider: empty(repositoryUrl) ? 'None' : 'GitHub'
    branch: empty(repositoryUrl) ? null : repositoryBranch
    repositoryUrl: empty(repositoryUrl) ? null : repositoryUrl
    repositoryToken: empty(repositoryUrl) ? null : repositoryToken
    buildProperties: empty(repositoryUrl) ? null : {
      appLocation: appLocation
      outputLocation: outputLocation
      appBuildCommand: appBuildCommand
      skipGithubActionWorkflowGeneration: false
      githubActionSecretNameOverride: 'AZURE_STATIC_WEB_APPS_API_TOKEN'
    }
    allowConfigFileUpdates: allowConfigFileUpdates
    stagingEnvironmentPolicy: 'Enabled'
    enterpriseGradeCdnStatus: sku == 'Standard' ? 'Enabled' : 'Disabled'
  }
}

// ============================================================================
// Configuración de enrutamiento si es necesario
// ============================================================================

resource staticWebAppConfig 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    env: 'production'
  }
}

// ============================================================================
// Outputs
// ============================================================================

output staticWebAppId string = staticWebApp.id
output staticWebAppName string = staticWebApp.name
output staticWebAppDefaultHostname string = staticWebApp.properties.defaultHostname
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output staticWebAppCustomDomainUrl string = staticWebApp.properties.customDomains[0] ?? 'Not configured'
output staticWebAppRepositoryUrl string = repositoryUrl
output staticWebAppRepositoryBranch string = repositoryBranch
