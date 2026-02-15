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

// Variables
var resourceNamePrefix = 'firesim-${environmentName}'
var staticWebAppName = '${resourceNamePrefix}-web'
var storageAccountName = replace('${resourceNamePrefix}stor', '-', '')
var keyVaultName = '${resourceNamePrefix}-kv'
var appInsightsName = '${resourceNamePrefix}-ai'
var contentSafetyName = '${resourceNamePrefix}-contentsafety'
var foundryAccountName = replace('${resourceNamePrefix}ai', '-', '')
var foundryProjectName = '${resourceNamePrefix}-project'

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
      FOUNDRY_ENDPOINT: foundry.outputs.endpoint
      FOUNDRY_DEPLOYMENT_NAME: foundry.outputs.deploymentName
      KEY_VAULT_URI: 'https://${keyVaultName}.${environment().suffixes.keyvaultDns}/'
      APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.outputs.connectionString
    }
  }
}

// Deploy AI Foundry (AIServices) account, project, and Stable Diffusion deployment
module foundry './modules/foundry.bicep' = {
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

// Reference the AI Foundry account for key retrieval (no deployment output of secrets)
resource foundryAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: foundryAccountName
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

// Deploy Key Vault
module keyVault './modules/keyVault.bicep' = {
  name: 'keyVault-deployment'
  params: {
    name: keyVaultName
    location: location
    sku: keyVaultSku
    tags: tags
    staticWebAppPrincipalId: staticWebApp.outputs.principalId
  }
}

// Store Foundry project settings in Key Vault
resource foundryProjectPathSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/Foundry--ProjectPath'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: foundryProjectPath
  }
}

resource foundryProjectRegionSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/Foundry--ProjectRegion'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: foundryProjectRegion
  }
}

resource foundryImageModelSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/Foundry--ImageModel'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: foundryImageModel
  }
}

// Store AI Foundry runtime settings in Key Vault
resource foundryEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/Foundry--Endpoint'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: foundry.outputs.endpoint
  }
}

resource foundryDeploymentNameSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/Foundry--DeploymentName'
  dependsOn: [
    keyVault
  ]
  properties: {
    value: foundry.outputs.deploymentName
  }
}

resource foundryApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  name: '${keyVaultName}/Foundry--ApiKey'
  dependsOn: [
    keyVault
    foundry
  ]
  properties: {
    value: foundryAccount.listKeys().key1
  }
}

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
    value: contentSafety.outputs.key
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
output foundryAccountName string = foundry.outputs.accountName
output foundryEndpoint string = foundry.outputs.endpoint
output foundryDeploymentName string = foundry.outputs.deploymentName
