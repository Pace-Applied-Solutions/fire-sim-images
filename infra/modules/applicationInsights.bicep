// Azure Application Insights for monitoring and audit logging
// Provides telemetry, structured logging, and audit trail for security compliance

@description('The name of the Application Insights instance')
param name string

@description('The Azure region')
param location string

@description('Tags to apply to the resource')
param tags object = {}

@description('Retention period in days')
@minValue(30)
@maxValue(730)
param retentionInDays int = 90

// Log Analytics Workspace for Application Insights
resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${name}-workspace'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Application Insights resource
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: name
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
    RetentionInDays: retentionInDays
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Outputs
output id string = appInsights.id
output name string = appInsights.name
output instrumentationKey string = appInsights.properties.InstrumentationKey
output connectionString string = appInsights.properties.ConnectionString
output workspaceId string = workspace.id
output workspaceName string = workspace.name
