// Static Web App with embedded Azure Functions API
// Provides hosting for the React front-end and serverless API at /api

@description('The name of the Static Web App')
param name string

@description('The Azure region')
param location string

@description('Static Web App SKU')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Free'

@description('Tags to apply to the resource')
param tags object = {}

@description('Additional app settings for the Static Web App')
param appSettings object = {}

// Static Web App resource
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: name
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    repositoryUrl: ''
    branch: ''
    buildProperties: {
      appLocation: 'apps/web'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
    stagingEnvironmentPolicy: sku == 'Standard' ? 'Enabled' : 'Disabled'
    allowConfigFileUpdates: true
    provider: 'Custom'
  }
}

// App settings for the Static Web App
// These will be available to the embedded API functions
resource appSettingsConfig 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: union({
    FUNCTIONS_WORKER_RUNTIME: 'node'
    AzureWebJobsFeatureFlags: 'EnableWorkerIndexing'
  }, appSettings)
}

// Outputs
output id string = staticWebApp.id
output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output url string = 'https://${staticWebApp.properties.defaultHostname}'
output principalId string = staticWebApp.identity.principalId
