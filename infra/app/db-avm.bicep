param accountName string
param location string = resourceGroup().location
param tags object = {}
param cosmosDatabaseName string = ''
param collections array = [
  {
    name: 'TodoList'
    id: 'TodoList'
    shardKey: {
      keys: [
        'Hash'
      ]
    }
    indexes: [
      {
        key: {
          keys: [
            '_id'
          ]
        }
      }
    ]
  }
  {
    name: 'TodoItem'
    id: 'TodoItem'
    shardKey: {
      keys: [
        'Hash'
      ]
    }
    indexes: [
      {
        key: {
          keys: [
            '_id'
          ]
        }
      }
    ]
  }
]

var defaultDatabaseName = 'Todo'
var actualDatabaseName = !empty(cosmosDatabaseName) ? cosmosDatabaseName : defaultDatabaseName

module cosmos 'br/public:avm/res/document-db/database-account:0.6.0' = {
  name: 'cosmos-mongo'
  params: {
    locations: [
      {
        failoverPriority: 0
        isZoneRedundant: false
        locationName: location
      }
    ]
    name: accountName
    location: location
    disableLocalAuth: true
    mongodbDatabases: [
      {
        name: actualDatabaseName
        tags: tags
        collections: collections
      }
    ]
  }
}

output databaseName string = actualDatabaseName
output endpoint string = cosmos.outputs.endpoint
output accountName string = accountName
output resourceId string = cosmos.outputs.resourceId
