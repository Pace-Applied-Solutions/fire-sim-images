// Azure AI Content Safety for scanning AI-generated content
// Detects and flags inappropriate content in prompts and images

@description('The name of the Content Safety resource')
param name string

@description('The Azure region')
param location string

@description('Tags to apply to the resource')
param tags object = {}

@description('SKU name for Content Safety')
@allowed([
  'F0'  // Free tier
  'S0'  // Standard tier
])
param sku string = 'S0'

// Content Safety resource
resource contentSafety 'Microsoft.CognitiveServices/accounts@2023-10-01-preview' = {
  name: name
  location: location
  tags: tags
  kind: 'ContentSafety'
  sku: {
    name: sku
  }
  properties: {
    customSubDomainName: name
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// Outputs
output id string = contentSafety.id
output name string = contentSafety.name
output endpoint string = contentSafety.properties.endpoint
output key string = contentSafety.listKeys().key1
