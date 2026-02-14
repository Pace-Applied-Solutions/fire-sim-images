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

// Azure OpenAI
param openAISku = 'S0'
param openAIModelName = 'dall-e-3'
param openAIModelVersion = '3.0'
param openAIModelCapacity = 2

// Tags
param tags = {
  Project: 'NSW RFS Fire Simulation'
  Environment: 'Production'
  ManagedBy: 'Bicep'
  CostCenter: 'Training'
}
