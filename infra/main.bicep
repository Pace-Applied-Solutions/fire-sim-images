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

@description('Azure OpenAI SKU name')
param openAISku string = 'S0'

@description('Azure OpenAI model deployment name')
param openAIModelName string = 'dall-e-3'

@description('Azure OpenAI model version')
param openAIModelVersion string = '3.0'

@description('Azure OpenAI model capacity')
param openAIModelCapacity int = 1

// Variables
var resourceNamePrefix = 'firesim-${environmentName}'
var staticWebAppName = '${resourceNamePrefix}-web'
var storageAccountName = replace('${resourceNamePrefix}stor', '-', '')
var keyVaultName = '${resourceNamePrefix}-kv'
var openAIName = '${resourceNamePrefix}-openai'

// Deploy Static Web App
module staticWebApp './modules/staticWebApp.bicep' = {
  name: 'staticWebApp-deployment'
  params: {
    name: staticWebAppName
    location: location
    sku: staticWebAppSku
    tags: tags
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

// Deploy Azure OpenAI
module openAI './modules/openai.bicep' = {
  name: 'openai-deployment'
  params: {
    name: openAIName
    location: location
    sku: openAISku
    tags: tags
    modelName: openAIModelName
    modelVersion: openAIModelVersion
    modelCapacity: openAIModelCapacity
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

output openAIName string = openAI.outputs.name
output openAIEndpoint string = openAI.outputs.endpoint
output openAIModelDeploymentName string = openAI.outputs.modelDeploymentName
