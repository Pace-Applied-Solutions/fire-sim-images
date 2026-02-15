// Development environment parameters
using '../main.bicep'

// Environment configuration
param environmentName = 'dev'
param location = 'australiaeast'

// Static Web App
param staticWebAppSku = 'Standard'

// Storage Account
param storageSku = 'Standard_LRS'

// Key Vault
param keyVaultSku = 'standard'

// Azure AI Foundry
param foundryProjectPath = 'open-ai-firesim-test/open-ai-firesim-test-project'
param foundryProjectRegion = 'eastus'
param foundryImageModel = 'stable-image-core'

// Content Safety
param contentSafetySku = 'S0'

// Application Insights
param appInsightsRetentionDays = 90

// Tags
param tags = {
  Project: 'NSW RFS Fire Simulation'
  Environment: 'Development'
  ManagedBy: 'Bicep'
  CostCenter: 'Training'
}
