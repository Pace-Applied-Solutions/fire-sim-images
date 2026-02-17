// Main orchestrator for NSW RFS Fire Simulation Inject Tool infrastructure
// This template deploys all required Azure resources for the MVP pipeline

targetScope = 'resourceGroup'

// Parameters
@description('The environment name (e.g., dev, prod)')
param environmentName string

@description('The Azure region for all resources')
param location string = resourceGroup().location

@description('Tags to apply to all resources')
param tags object = {
  Project: 'NSW RFS Fire Simulation'
  Environment: environmentName
  ManagedBy: 'Bicep'
}

@description('Static Web App SKU name')
@allowed([
  'Free'
  'Standard'
])
param staticWebAppSku string = 'Free'

@description('Storage account SKU name')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_RAGRS'
  'Standard_ZRS'
])
param storageSku string = 'Standard_LRS'

@description('Key Vault SKU name')
@allowed([
  'standard'
  'premium'
])
param keyVaultSku string = 'standard'

@description('Azure AI Foundry project path (workspace/project)')
param foundryProjectPath string

@description('Azure AI Foundry project region')
param foundryProjectRegion string = 'eastus'

@description('Image model to use in Foundry')
param foundryImageModel string = 'stable-image-core'

@description('AI Foundry account SKU (AIServices)')
param foundrySku string = 'S0'

@description('AI Foundry deployment capacity (throughput units)')
@minValue(1)
param foundryDeploymentCapacity int = 1

@description('AI Foundry deployment name')
param foundryDeploymentName string = 'stable-image-core'

@description('AI Foundry model version')
param foundryModelVersion string = '1.0'

@description('AI Foundry model format')
param foundryModelFormat string = 'OpenAI'

@description('AI Foundry model publisher')
param foundryModelPublisher string = 'stabilityai'

@description('Deploy AI Foundry resources (set to false when using an existing deployment)')
param deployFoundry bool = false

@description('Image model endpoint URL (e.g., https://your-resource.cognitiveservices.azure.com)')
param imageModelEndpoint string = ''

@description('Image model deployment name (e.g., FLUX.1-Kontext-pro, gpt-image-1)')
param imageModelDeployment string = ''

@description('Image model name for direct API providers (e.g., gemini-3-pro-image-preview)')
param imageModel string = ''

@description('Image model base URL for direct API providers (e.g., https://generativelanguage.googleapis.com/v1beta)')
param imageModelUrl string = ''

@secure()
@description('Image model API key for direct API providers (stored in Key Vault)')
param imageModelKey string = ''

@description('Content Safety SKU')
@allowed([
  'F0'
  'S0'
])
param contentSafetySku string = 'S0'

@description('Application Insights retention in days')
@minValue(30)
@maxValue(730)
param appInsightsRetentionDays int = 90

@description('Maximum instance count for the Function App Flex Consumption plan')
@minValue(1)
@maxValue(1000)
param functionAppMaxInstanceCount int = 100

@description('Instance memory in MB for the Function App Flex Consumption plan')
@allowed([
  512
  2048
  4096
])
param functionAppInstanceMemoryMB int = 2048

// Variables
var resourceNamePrefix = 'firesim-${environmentName}'
var staticWebAppName = '${resourceNamePrefix}-web'
var storageAccountName = replace('${resourceNamePrefix}stor', '-', '')
var keyVaultName = '${resourceNamePrefix}-kv'
var appInsightsName = '${resourceNamePrefix}-ai'
var contentSafetyName = '${resourceNamePrefix}-contentsafety'
var foundryAccountName = replace('${resourceNamePrefix}ai', '-', '')
var foundryProjectName = '${resourceNamePrefix}-project'
var functionAppName = '${resourceNamePrefix}-api'
var functionAppPlanName = '${resourceNamePrefix}-plan'

// Deploy Static Web App
module staticWebApp './modules/staticWebApp.bicep' = {
  name: 'staticWebApp-deployment'
  params: {
    name: staticWebAppName
    location: location
    sku: staticWebAppSku
    tags: tags
    appSettings: {
      FOUNDRY_PROJECT_PATH: foundryProjectPath
      FOUNDRY_PROJECT_REGION: foundryProjectRegion
      FOUNDRY_IMAGE_MODEL: foundryImageModel
      FOUNDRY_ENDPOINT: ''
      FOUNDRY_DEPLOYMENT_NAME: ''
      IMAGE_MODEL_ENDPOINT: imageModelEndpoint
      IMAGE_MODEL_DEPLOYMENT: imageModelDeployment
      KEY_VAULT_URI: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/'
      APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.outputs.connectionString
    }
  }
}

// Deploy AI Foundry (AIServices) account, project, and Stable Diffusion deployment
module foundry './modules/foundry.bicep' = if (deployFoundry) {
  name: 'foundry-deployment'
  params: {
    name: foundryAccountName
    location: foundryProjectRegion
    sku: foundrySku
    tags: tags
    projectName: foundryProjectName
    deploymentName: foundryDeploymentName
    modelName: foundryImageModel
    modelVersion: foundryModelVersion
    modelFormat: foundryModelFormat
    modelPublisher: foundryModelPublisher
    capacity: foundryDeploymentCapacity
  }
}

// Deploy Application Insights
module appInsights './modules/applicationInsights.bicep' = {
  name: 'appInsights-deployment'
  params: {
    name: appInsightsName
    location: location
    tags: tags
    retentionInDays: appInsightsRetentionDays
  }
}

// Deploy Content Safety
module contentSafety './modules/contentSafety.bicep' = {
  name: 'contentSafety-deployment'
  params: {
    name: contentSafetyName
    location: location
    tags: tags
    sku: contentSafetySku
  }
}

resource contentSafetyResource 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' existing = {
  name: contentSafetyName
}

// Deploy Storage Account
module storage './modules/storage.bicep' = {
  name: 'storage-deployment'
  params: {
    name: storageAccountName
    location: location
    sku: storageSku
    tags: tags
    allowedOrigins: [
      'https://${staticWebApp.outputs.defaultHostname}'
    ]
  }
}

// Deploy Azure Functions App (Flex Consumption plan)
module functionApp './modules/functionApp.bicep' = {
  name: 'functionApp-deployment'
  params: {
    name: functionAppName
    hostingPlanName: functionAppPlanName
    location: location
    tags: tags
    storageAccountName: storage.outputs.name
    appInsightsConnectionString: appInsights.outputs.connectionString
    keyVaultUri: 'https://${keyVaultName}${environment().suffixes.keyvaultDns}/'
    maximumInstanceCount: functionAppMaxInstanceCount
    instanceMemoryMB: functionAppInstanceMemoryMB
    runtimeName: 'node'
    runtimeVersion: '22'
    deploymentContainerName: 'function-deployments'
    additionalAppSettings: {
      AZURE_STORAGE_CONTAINER_NAME: 'generated-images'
      FOUNDRY_PROJECT_PATH: foundryProjectPath
      FOUNDRY_PROJECT_REGION: foundryProjectRegion
      FOUNDRY_IMAGE_MODEL: foundryImageModel
      IMAGE_MODEL_ENDPOINT: imageModelEndpoint
      IMAGE_MODEL_DEPLOYMENT: imageModelDeployment
      IMAGE_MODEL: imageModel
      IMAGE_MODEL_URL: imageModelUrl
      // Key Vault reference for the API key — the Function App's managed identity
      // reads the secret at runtime. This avoids storing the key in plain text.
      IMAGE_MODEL_KEY: !empty(imageModelKey) ? '@Microsoft.KeyVault(SecretUri=https://${keyVaultName}${environment().suffixes.keyvaultDns}/secrets/ImageModel--Key/)' : ''
    }
  }
}

// Grant Function App's managed identity the Monitoring Metrics Publisher role
// on Application Insights (required for AAD-based App Insights auth)
resource appInsightsResource 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

resource appInsightsMonitoringRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(appInsightsResource.id, functionAppName, '3913510d-42f4-4e42-8a64-420c390055eb')
  scope: appInsightsResource
  properties: {
    principalId: functionApp.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '3913510d-42f4-4e42-8a64-420c390055eb')
  }
}

// Deploy Key Vault
module keyVault './modules/keyVault.bicep' = {
  name: 'keyVault-deployment'
  params: {
    name: keyVaultName
    location: location
    sku: keyVaultSku
    tags: tags
    staticWebAppPrincipalId: staticWebApp.outputs.principalId
    functionAppPrincipalId: functionApp.outputs.principalId
  }
}

// Store Foundry project settings in Key Vault
// Foundry secrets skipped when deployFoundry is false; use manual Key Vault secrets for external deployments

// Store Content Safety credentials in Key Vault
resource contentSafetyEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/ContentSafety--Endpoint'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: contentSafety.outputs.endpoint
  }
}

resource contentSafetyKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/ContentSafety--Key'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: contentSafetyResource.listKeys().key1
  }
}

// Store Image Model API key in Key Vault (when provided)
resource imageModelKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(imageModelKey)) {
  name: '${keyVaultName}/ImageModel--Key'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: imageModelKey
  }
}

// Outputs
output staticWebAppName string = staticWebApp.outputs.name
output staticWebAppUrl string = staticWebApp.outputs.url
output staticWebAppDefaultHostname string = staticWebApp.outputs.defaultHostname
output staticWebAppPrincipalId string = staticWebApp.outputs.principalId

output storageAccountName string = storage.outputs.name
output storageAccountId string = storage.outputs.id
output storageContainers array = storage.outputs.containers

output keyVaultName string = keyVault.outputs.name
output keyVaultId string = keyVault.outputs.id
output keyVaultUri string = keyVault.outputs.uri

output appInsightsName string = appInsights.outputs.name
output appInsightsConnectionString string = appInsights.outputs.connectionString
output appInsightsInstrumentationKey string = appInsights.outputs.instrumentationKey

output contentSafetyName string = contentSafety.outputs.name
output contentSafetyEndpoint string = contentSafety.outputs.endpoint

output foundryProjectPath string = foundryProjectPath
output foundryProjectRegion string = foundryProjectRegion
output foundryImageModel string = foundryImageModel
output functionAppName string = functionApp.outputs.name
output functionAppUrl string = functionApp.outputs.url
output functionAppDefaultHostname string = functionApp.outputs.defaultHostname
output functionAppPrincipalId string = functionApp.outputs.principalId
output functionAppHostingPlanName string = functionApp.outputs.hostingPlanName

output foundryAccountName string = ''
output foundryEndpoint string = ''
output foundryDeploymentName string = ''

output imageModelEndpoint string = imageModelEndpoint
output imageModelDeployment string = imageModelDeployment
