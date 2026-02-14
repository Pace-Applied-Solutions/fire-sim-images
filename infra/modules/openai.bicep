// Azure OpenAI Service with DALL-E 3 model deployment
// Used for generating photorealistic bushfire imagery

@description('The name of the Azure OpenAI resource')
param name string

@description('The Azure region')
param location string

@description('Azure OpenAI SKU')
param sku string = 'S0'

@description('Tags to apply to the resource')
param tags object = {}

@description('Model name to deploy')
param modelName string = 'dall-e-3'

@description('Model version')
param modelVersion string = '3.0'

@description('Model capacity (throughput units)')
param modelCapacity int = 1

// Azure OpenAI resource
resource openAI 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: name
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: sku
  }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
    disableLocalAuth: false
  }
}

// Model deployment
resource modelDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-10-01-preview' = {
  parent: openAI
  name: modelName
  sku: {
    name: 'Standard'
    capacity: modelCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}

// Outputs
output id string = openAI.id
output name string = openAI.name
output endpoint string = openAI.properties.endpoint
output modelDeploymentName string = modelDeployment.name
