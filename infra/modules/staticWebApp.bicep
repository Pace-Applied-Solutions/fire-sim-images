// Static Web App – front-end only
// The API is a standalone Azure Functions app linked via SWA "Bring Your Own Functions"

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
      outputLocation: 'dist'
    }
    stagingEnvironmentPolicy: sku == 'Standard' ? 'Enabled' : 'Disabled'
    allowConfigFileUpdates: true
    provider: 'Custom'
  }
}

// App settings for the Static Web App
resource appSettingsConfig 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: appSettings
}

// Outputs
output id string = staticWebApp.id
output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output url string = 'https://${staticWebApp.properties.defaultHostname}'
output principalId string = staticWebApp.identity.principalId

// Input parameter for linking the Function App (for BYOF pattern)
@description('Resource ID of the Function App to link (optional)')
param linkedFunctionAppResourceId string = ''

// Link the Function App to the Static Web App if provided
resource linkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-01-01' = if (linkedFunctionAppResourceId != '') {
  parent: staticWebApp
  name: 'api-backend'
  properties: {
    backendResourceId: linkedFunctionAppResourceId
    region: location
  }
}
