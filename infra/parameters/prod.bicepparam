// Production environment parameters
using '../main.bicep'

// Environment configuration
param environmentName = 'prod'
param location = 'australiaeast'

// Static Web App
param staticWebAppSku = 'Standard'

// Storage Account
param storageSku = 'Standard_RAGRS'

// Key Vault
param keyVaultSku = 'premium'

// Azure AI Foundry
param foundryProjectPath = 'firesimprodai/firesim-prod-project'
param foundryProjectRegion = 'eastus'
param foundryImageModel = 'stable-image-core'
param foundrySku = 'S0'
param foundryDeploymentCapacity = 2
param foundryDeploymentName = 'stable-image-core'
param foundryModelVersion = '1.0'
param foundryModelFormat = 'OpenAI'
param foundryModelPublisher = 'stabilityai'

// Content Safety
param contentSafetySku = 'S0'

// Application Insights
param appInsightsRetentionDays = 365

// Tags
param tags = {
  Project: 'NSW RFS Fire Simulation'
  Environment: 'Production'
  ManagedBy: 'Bicep'
  CostCenter: 'Training'
}
