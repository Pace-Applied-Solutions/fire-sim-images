// Azure Key Vault for secrets management
// Stores API keys and connection strings with soft delete enabled

@description('The name of the Key Vault')
param name string

@description('The Azure region')
param location string

@description('Key Vault SKU')
@allowed([
  'standard'
  'premium'
])
param sku string = 'standard'

@description('Tags to apply to the resource')
param tags object = {}

@description('Principal ID of the Static Web App managed identity')
param staticWebAppPrincipalId string

@description('Azure AD tenant ID')
param tenantId string = tenant().tenantId

// Key Vault resource
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    tenantId: tenantId
    sku: {
      family: 'A'
      name: sku
    }
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    enableRbacAuthorization: false
    accessPolicies: []
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Grant Static Web App access to secrets
resource staticWebAppAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        tenantId: tenantId
        objectId: staticWebAppPrincipalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// Outputs
output id string = keyVault.id
output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
