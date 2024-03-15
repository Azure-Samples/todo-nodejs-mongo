targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the the environment which is used to generate a short unique hash used in all resources.')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('The email address of the owner of the service')
@minLength(1)
param publisherEmail string = 'noreply@microsoft.com'

@description('The name of the owner of the service')
@minLength(1)
param publisherName string = 'n/a'

param connectionStringKey string = 'AZURE-COSMOS-CONNECTION-STRING'
param databaseName string = ''
// Because databaseName is optional in main.bicep, we make sure the database name is set here.
var defaultDatabaseName = 'Todo'
var actualDatabaseName = !empty(databaseName) ? databaseName : defaultDatabaseName

// Optional parameters to override the default azd resource naming conventions. Update the main.parameters.json file to provide values. e.g.,:
// "resourceGroupName": {
//      "value": "myGroupName"
// }
param apiServiceName string = ''
param applicationInsightsDashboardName string = ''
param applicationInsightsName string = ''
param appServicePlanName string = ''
param cosmosAccountName string = ''
param cosmosDatabaseName string = ''
param keyVaultName string = ''
param logAnalyticsName string = ''
param resourceGroupName string = ''
param webServiceName string = ''
param apimServiceName string = ''

var actualCosmosAccountName = !empty(cosmosAccountName)? cosmosAccountName: '${abbrs.documentDBDatabaseAccounts}${resourceToken}'

@description('Flag to use Azure API Management to mediate the calls between the Web frontend and the backend API')
param useAPIM bool = false

@description('API Management SKU to use if APIM is enabled')
@allowed([
  'Consumption'
  'Developer'
  'Standard'
  'Premium'
])
param apimSku string = 'Consumption'

@description('Id of the user or app to assign application roles')
param principalId string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = { 'azd-env-name': environmentName }

// Organize resources in a resource group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(resourceGroupName) ? resourceGroupName : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// The application frontend
module web 'br/public:avm/res/web/site:0.2.0' = {
  scope: rg
  name: 'web'
  params: {
    kind: 'app'
    name: !empty(webServiceName) ? webServiceName : '${abbrs.webSitesAppService}web-${resourceToken}'
    serverFarmResourceId: appServicePlan.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'web' })
    location: location
    appInsightResourceId: applicationInsights.outputs.resourceId
    siteConfig: {
      windowsFxVersion: 'node|18-lts'
      appCommandLine: './entrypoint.sh -o ./env-config.js && pm2 serve /home/site/wwwroot --no-daemon --spa'
    }
  }
}

// Set environment variables for the frontend
module webAppSettings 'br/public:avm/res/web/site:0.2.0' = {
  scope: rg
  name: 'web-appsettings'
  params: {
    kind: 'app'
    name: web.outputs.name
    serverFarmResourceId: appServicePlan.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'web' })
    appSettingsKeyValuePairs: {
      REACT_APP_API_BASE_URL: 'https://${api.outputs.defaultHostname}'
      REACT_APP_APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsights.outputs.connectionString
    }
  }
}

// The application backend
module api 'br/public:avm/res/web/site:0.2.0' = {
  scope: rg
  name: !empty(apiServiceName) ? apiServiceName : '${abbrs.webSitesAppService}api-${resourceToken}'
  params: {
    kind: 'app'
    name: !empty(apiServiceName) ? apiServiceName : '${abbrs.webSitesAppService}api-${resourceToken}'
    serverFarmResourceId: appServicePlan.outputs.resourceId
    tags: union(tags, { 'azd-service-name': 'api' })
    location: location
    appInsightResourceId: applicationInsights.outputs.resourceId
    managedIdentities: {
      systemAssigned: true
    }
    siteConfig: {
      cors: {
        allowedOrigins: [ 'https://portal.azure.com', 'https://ms.portal.azure.com' ,'https://${web.outputs.defaultHostname}' ]
      }
      alwaysOn: true
      linuxFxVersion: 'node|18-lts'
      appCommandLine: ''
    }
    appSettingsKeyValuePairs: {
      AZURE_KEY_VAULT_ENDPOINT: keyVault.outputs.uri
      AZURE_COSMOS_CONNECTION_STRING_KEY: connectionStringKey
      AZURE_COSMOS_DATABASE_NAME: !empty(cosmosDatabaseName) ? cosmosDatabaseName: 'Todo'
      AZURE_COSMOS_ENDPOINT: 'https://${cosmos.outputs.name}.mongo.cosmos.azure.com:443/'
      API_ALLOW_ORIGINS: 'https://${web.outputs.defaultHostname}'
      SCM_DO_BUILD_DURING_DEPLOYMENT: 'True'
      ENABLE_ORYX_BUILD: 'True'
    }
  }
}

// The application database
module cosmos 'br/public:avm/res/document-db/database-account:0.3.0' = {
  scope: rg
  name: 'cosmos'
  params: {
    locations: [
      {
        failoverPriority: 0
        isZoneRedundant: false
        locationName: location
      }
    ]
    name: actualCosmosAccountName
    location: location
    managedIdentities: {
      systemAssigned: true
    }
    mongodbDatabases: [
      {
        collections: [
          {
            indexes: [
              {
                key: {
                  keys: [
                    '_id'
                  ]
                }
              }
              {
                key: {
                  keys: [
                    '_id'
                  ]
                }
                options: {
                  unique: true
                }
              }
            ]
            name: 'TodoList'
            shardKey: {
              _id: 'Hash'
            }
            throughput: 600
          }
          {
            indexes: [
              {
                key: {
                  keys: [
                    '_id'
                  ]
                }
              }
              {
                key: {
                  keys: [
                    '_id'
                  ]
                }
                options: {
                  unique: true
                }
              }
            ]
            name: 'TodoItem'
            shardKey: {
              _id: 'Hash'
            }
          }
        ]
        name: actualDatabaseName
        throughput: 800
      }
    ]
    tags: tags
  }
}

// Create an App Service Plan to group applications under the same payment plan and SKU
module appServicePlan 'br/public:avm/res/web/serverfarm:0.1.0' = {
  scope: rg
  name: 'appserviceplan'
  params: {
    name: !empty(appServicePlanName) ? appServicePlanName : '${abbrs.webServerFarms}${resourceToken}'
    sku: {
      capacity: 1
      family: 'B'
      name: 'B1'
      size: 'B1'
      tier: 'Basic'
    }
    location: location
    tags: tags
    kind: 'Linux'
    reserved: true
  }
}

// Store secrets in a keyvault
module keyVault './app/keyvault-secrets.bicep' = {
  scope:rg
  name: 'keyvault'
  params:{
    name: !empty(keyVaultName) ? keyVaultName : '${abbrs.keyVaultVaults}${resourceToken}'
    location: location
    tags: tags
    connectionStringKey: connectionStringKey
    cosmosAccountName: cosmos.outputs.name
    principalId:principalId
    resourceGroupName:rg.name
  }
  dependsOn:[
    cosmos
  ]
}

// Give the API access to KeyVault
module apiKeyVaultAccess 'br/public:avm/res/key-vault/vault:0.3.5' = {
  name: 'api-keyvault-access'
  scope: rg
  params: {
    name: keyVault.outputs.name
    enableRbacAuthorization: false
    tags: tags
    accessPolicies: [
      {
        objectId: principalId
        permissions: {
          secrets: [ 'get', 'list' ]
        }
      }
      {
        objectId: api.outputs.systemAssignedMIPrincipalId
        permissions: {
          secrets: [ 'get', 'list' ]
        }
      }
    ]
  }
}

// Monitor application with Azure Monitor
module logAnalytics 'br/public:avm/res/operational-insights/workspace:0.3.4' = {
  scope: rg
  name: 'logAnalytics'
  params: {
    name: !empty(logAnalyticsName) ? logAnalyticsName : '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    location: location
    tags: tags
  }
}
module applicationInsights 'br/public:avm/res/insights/component:0.3.0' = {
  scope: rg
  name: 'applicationInsights'
  params: {
    name: !empty(applicationInsightsName) ? applicationInsightsName : '${abbrs.insightsComponents}${resourceToken}'
    workspaceResourceId: logAnalytics.outputs.resourceId
    location: location
    tags: tags
  }
}

module applicationInsightsDashboard './app/applicationinsights-dashboard.bicep' = {
  scope: rg
  name: 'application-insights-dashboard'
  params: {
    name: !empty(applicationInsightsDashboardName) ? applicationInsightsDashboardName : '${abbrs.portalDashboards}${resourceToken}'
    location: location
    applicationInsightsName: applicationInsights.outputs.name
  }
}

// Creates Azure API Management (APIM) service to mediate the requests between the frontend and the backend API
module apim 'br/public:avm/res/api-management/service:0.1.3' = if (useAPIM) {
  scope: rg
  name: 'apim-deployment'
  params: {
    name: !empty(apimServiceName) ? apimServiceName : '${abbrs.apiManagementService}${resourceToken}'
    publisherEmail: publisherEmail
    publisherName: publisherName
    location: location
    tags: tags
    // sku: apimSku
    customProperties: apimSku == 'Consumption' ? {} : {
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_GCM_SHA256': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_256_CBC_SHA256': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_CBC_SHA256': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_256_CBC_SHA': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TLS_RSA_WITH_AES_128_CBC_SHA': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TripleDes168': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls10': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls11': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Ssl30': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls10': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls11': 'false'
      'Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Ssl30': 'false'
    }
  }
}

// Configures the API in the Azure API Management (APIM) service
module apimApi './app/apim-api.bicep' = if (useAPIM) {
  name: 'apim-api-deployment'
  scope: rg
  params: {
    name: useAPIM ? apim.outputs.name : ''
    apiName: 'todo-api'
    apiDisplayName: 'Simple Todo API'
    apiDescription: 'This is a simple Todo API'
    apiPath: 'todo'
    webFrontendUrl: 'https://${web.outputs.defaultHostname}'
    apiBackendUrl: 'https://${api.outputs.defaultHostname}'
    apiAppName: api.outputs.name
    applicationInsightsName: applicationInsights.outputs.name
  }
}

// Data outputs
output AZURE_COSMOS_CONNECTION_STRING_KEY string = connectionStringKey
output AZURE_COSMOS_DATABASE_NAME string = actualDatabaseName

// App outputs
output APPLICATIONINSIGHTS_CONNECTION_STRING string = applicationInsights.outputs.connectionString
output AZURE_KEY_VAULT_ENDPOINT string = keyVault.outputs.uri
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output REACT_APP_API_BASE_URL string = useAPIM ? apimApi.outputs.SERVICE_API_URI : 'https://${api.outputs.defaultHostname}'
output REACT_APP_APPLICATIONINSIGHTS_CONNECTION_STRING string = applicationInsights.outputs.connectionString
output REACT_APP_WEB_BASE_URL string = 'https://${web.outputs.defaultHostname}'
output USE_APIM bool = useAPIM
output SERVICE_API_ENDPOINTS array = useAPIM ? [ apimApi.outputs.SERVICE_API_URI, 'https://${api.outputs.defaultHostname}' ]: []
