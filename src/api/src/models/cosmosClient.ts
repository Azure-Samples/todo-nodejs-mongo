
import { CosmosClient, Container, Database } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { DatabaseConfig } from "../config/appConfig";
import { logger } from "../config/observability";

let cosmosClient: CosmosClient;
let database: Database;
let todoListContainer: Container;
let todoItemContainer: Container;

export const configureCosmos = async (config: DatabaseConfig) => {
    // Skip Cosmos DB configuration in test environment
    if (process.env.NODE_ENV === "test") {
        logger.info("Skipping Cosmos DB configuration in test environment");
        return;
    }
    
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
    if (process.env.NODE_ENV === "test") {
        // Return a mock container for testing
        return createMockContainer();
    }
    if (!todoListContainer) {
        throw new Error("Cosmos DB not initialized. Call configureCosmos first.");
    }
    return todoListContainer;
};

export const getTodoItemContainer = () => {
    if (process.env.NODE_ENV === "test") {
        // Return a mock container for testing
        return createMockContainer();
    }
    if (!todoItemContainer) {
        throw new Error("Cosmos DB not initialized. Call configureCosmos first.");
    }
    return todoItemContainer;
};

// Mock container for testing
const mockData = new Map<string, any>();

const createMockContainer = () => ({
    items: {
        create: async (item: any) => { 
            const resource = { 
                id: `mock-${Date.now()}-${Math.random()}`, 
                ...item,
                createdDate: new Date(),
                updatedDate: new Date()
            };
            mockData.set(resource.id, resource);
            return { resource };
        },
        readAll: () => ({ 
            fetchAll: async () => ({ 
                resources: Array.from(mockData.values()) 
            }) 
        }),
        query: (spec: any) => ({ 
            fetchAll: async () => {
                const resources = Array.from(mockData.values());
                // Simple query implementation for tests
                if (spec.query && spec.query.includes("listId")) {
                    const listIdParam = spec.parameters?.find((p: any) => p.name === "@listId");
                    if (listIdParam) {
                        return {
                            resources: resources.filter((r: any) => r.listId === listIdParam.value)
                        };
                    }
                }
                return { resources };
            }
        }),
    },
    item: (id: string) => ({
        read: async () => ({ 
            resource: mockData.get(id) || null 
        }),
        replace: async (item: any) => { 
            const resource = { ...item, updatedDate: new Date() };
            mockData.set(id, resource);
            return { resource };
        },
        delete: async () => {
            mockData.delete(id);
            return {};
        },
    }),
});

export const getCosmosClient = () => {
    if (!cosmosClient) {
        throw new Error("Cosmos DB not initialized. Call configureCosmos first.");
    }
    return cosmosClient;
};

export const clearMockData = () => {
    if (process.env.NODE_ENV === "test") {
        mockData.clear();
    }
};