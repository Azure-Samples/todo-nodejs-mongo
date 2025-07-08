import { CosmosClient, Container, Database } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { DatabaseConfig } from "../config/appConfig";
import { logger } from "../config/observability";

let cosmosClient: CosmosClient;
let database: Database;
let todoListContainer: Container;
let todoItemContainer: Container;

export const configureCosmos = async (config: DatabaseConfig) => {
    try {
        logger.info("Connecting to Cosmos DB using managed identity...");
        
        const credential = new DefaultAzureCredential();
        
        cosmosClient = new CosmosClient({
            endpoint: config.endpoint,
            aadCredentials: credential,
        });

        database = cosmosClient.database(config.databaseName);
        todoListContainer = database.container("TodoList");
        todoItemContainer = database.container("TodoItem");

        // Test the connection
        await database.read();
        logger.info("Cosmos DB connected successfully!");
        
    } catch (err) {
        logger.error(`Cosmos DB connection error: ${err}`);
        throw err;
    }
};

export const getTodoListContainer = () => {
    if (!todoListContainer) {
        throw new Error("Cosmos DB not initialized. Call configureCosmos first.");
    }
    return todoListContainer;
};

export const getTodoItemContainer = () => {
    if (!todoItemContainer) {
        throw new Error("Cosmos DB not initialized. Call configureCosmos first.");
    }
    return todoItemContainer;
};

export const getCosmosClient = () => {
    if (!cosmosClient) {
        throw new Error("Cosmos DB not initialized. Call configureCosmos first.");
    }
    return cosmosClient;
};