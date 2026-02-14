// Development environment parameters
using '../main.bicep'

// Environment configuration
param environmentName = 'dev'
param location = 'australiaeast'

// Static Web App
param staticWebAppSku = 'Free'

// Storage Account
param storageSku = 'Standard_LRS'

// Key Vault
param keyVaultSku = 'standard'

// Azure OpenAI
param openAISku = 'S0'
param openAIModelName = 'dalle'
param openAIModelVersion = '2.0'
param openAIModelCapacity = 1

// Tags
param tags = {
  Project: 'NSW RFS Fire Simulation'
  Environment: 'Development'
  ManagedBy: 'Bicep'
  CostCenter: 'Training'
}
