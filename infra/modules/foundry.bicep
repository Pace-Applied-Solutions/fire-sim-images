// Azure AI Foundry account, project, and model deployment for Stable Diffusion
// Creates an AIServices account, a default project, and deploys Stable Image Core

@description('AI Foundry account name (AIServices). Must be globally unique, 2-64 chars, alphanumeric and hyphens.')
param name string

@description('Azure region for the AI Foundry resources')
param location string

@description('SKU for the AI Foundry (AIServices) account')
param sku string = 'S0'

@description('Resource tags applied to all resources in this module')
param tags object = {}

@description('Project name to create under the AI Foundry account')
param projectName string

@description('Deployment name for the Stable Diffusion model')
param deploymentName string

@description('Model name to deploy (e.g., stable-image-core)')
param modelName string = 'stable-image-core'

@description('Model version to deploy')
param modelVersion string = '1.0'

@description('Model format for deployment')
param modelFormat string = 'OpenAI'

@description('Model publisher')
param modelPublisher string = 'stabilityai'

@description('Throughput units for the deployment (capacity)')
@minValue(1)
param capacity int = 1

// AI Foundry account (AIServices)
resource aiAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: name
  location: location
  kind: 'AIServices'
  sku: {
    name: sku
  }
  tags: tags
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    disableLocalAuth: false
  }
}

// AI Foundry project
resource aiProject 'Microsoft.CognitiveServices/accounts/projects@2025-09-01' = {
  parent: aiAccount
  name: projectName
  location: location
  tags: tags
  properties: {
    displayName: projectName
    description: 'Fire simulation image generation project'
  }
}

// Stable Diffusion (Stable Image Core) deployment
resource sdDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: aiAccount
  name: deploymentName
  sku: {
    name: 'Standard'
    capacity: capacity
  }
  properties: {
    model: {
      format: modelFormat
      name: modelName
      version: modelVersion
      publisher: modelPublisher
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

output accountName string = aiAccount.name
output endpoint string = aiAccount.properties.endpoint
output projectName string = aiProject.name
output deploymentName string = sdDeployment.name
