// Azure Functions App on Flex Consumption plan
// Standalone Function App linked to Static Web App via BYOF pattern
// Uses managed identity for storage, Key Vault, and App Insights authentication

@description('The name of the Function App')
param name string

@description('The Azure region')
param location string

@description('Tags to apply to resources')
param tags object = {}

@description('Name of the Flex Consumption hosting plan')
param hostingPlanName string

@description('Storage account name for AzureWebJobsStorage and deployment')
param storageAccountName string

@description('Application Insights connection string')
param appInsightsConnectionString string

@description('Key Vault URI for secret references')
param keyVaultUri string = ''

@description('Maximum instance count for scaling')
@minValue(1)
@maxValue(1000)
param maximumInstanceCount int = 100

@description('Instance memory in MB')
@allowed([512, 2048, 4096])
param instanceMemoryMB int = 2048

@description('Function runtime name')
@allowed(['node', 'dotnet-isolated', 'python', 'java', 'powerShell', 'custom'])
param runtimeName string = 'node'

@description('Function runtime version')
param runtimeVersion string = '22'

@description('Name of the blob container used for deployment packages')
param deploymentContainerName string = 'function-deployments'

@description('Additional app settings for the Function App')
param additionalAppSettings object = {}

// ── Flex Consumption Hosting Plan ──────────────────────────────────────────────
resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: hostingPlanName
  location: location
  tags: tags
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  kind: 'functionapp'
  properties: {
    reserved: true // Required for Linux
  }
}

// ── Reference existing storage account ─────────────────────────────────────────
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

// ── Build app settings ─────────────────────────────────────────────────────────
// Flex Consumption uses managed identity for AzureWebJobsStorage instead of
// connection strings. FUNCTIONS_WORKER_RUNTIME and FUNCTIONS_EXTENSION_VERSION
// are replaced by functionAppConfig.runtime.
var baseAppSettings = {
  // Managed-identity storage endpoints (replaces AzureWebJobsStorage connection string)
  AzureWebJobsStorage__accountName: storageAccountName
  AzureWebJobsStorage__credential: 'managedidentity'
  AzureWebJobsStorage__blobServiceUri: 'https://${storageAccountName}.blob.${environment().suffixes.storage}'
  AzureWebJobsStorage__queueServiceUri: 'https://${storageAccountName}.queue.${environment().suffixes.storage}'
  AzureWebJobsStorage__tableServiceUri: 'https://${storageAccountName}.table.${environment().suffixes.storage}'
  // Application Insights (AAD auth)
  APPLICATIONINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
  APPLICATIONINSIGHTS_AUTHENTICATION_STRING: 'Authorization=AAD'
  // Storage account for app-level blob operations (generated images etc.)
  AZURE_STORAGE_ACCOUNT_NAME: storageAccountName
}

// Merge base + Key Vault + any additional settings passed by the caller
var keyVaultSettings = !empty(keyVaultUri) ? { KEY_VAULT_URI: keyVaultUri } : {}
var mergedAppSettings = union(baseAppSettings, keyVaultSettings, additionalAppSettings)

// ── Function App (Flex Consumption) ────────────────────────────────────────────
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  tags: tags
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageAccount.properties.primaryEndpoints.blob}${deploymentContainerName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: maximumInstanceCount
        instanceMemoryMB: instanceMemoryMB
      }
      runtime: {
        name: runtimeName
        version: runtimeVersion
      }
    }
    siteConfig: {
      appSettings: [for item in items(mergedAppSettings): {
        name: item.key
        value: item.value
      }]
    }
  }
}

// ── RBAC Role Assignments ──────────────────────────────────────────────────────
// The Function App's system-assigned managed identity needs these roles on the
// storage account to operate correctly with Flex Consumption:

// Storage Blob Data Owner – deployment package access + app blob operations
resource storageBlobDataOwner 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
  scope: storageAccount
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
  }
}

// Storage Queue Data Contributor – Azure Functions internal queue operations
resource storageQueueDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, '974c5e8b-45b9-4653-ba55-5f855dd0fb88')
  scope: storageAccount
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88')
  }
}

// Storage Table Data Contributor – Azure Functions internal table operations
resource storageTableDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
  scope: storageAccount
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
  }
}

// ── Outputs ────────────────────────────────────────────────────────────────────
output id string = functionApp.id
output name string = functionApp.name
output defaultHostname string = functionApp.properties.defaultHostName
output url string = 'https://${functionApp.properties.defaultHostName}'
output principalId string = functionApp.identity.principalId
output hostingPlanId string = hostingPlan.id
output hostingPlanName string = hostingPlan.name
