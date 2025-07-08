import { getTodoItemContainer } from "./cosmosClient";
import { TodoItem, TodoItemState } from "./todoItem";
import { v4 as uuidv4 } from "uuid";

export class TodoItemRepository {
    private container = getTodoItemContainer();

    async findByListId(listId: string): Promise<TodoItem[]> {
        const querySpec = {
            query: "SELECT * FROM c WHERE c.listId = @listId",
            parameters: [
                {
                    name: "@listId",
                    value: listId
                }
            ]
        };

        const { resources } = await this.container.items.query(querySpec).fetchAll();
        return resources as TodoItem[];
    }

    async findById(id: string): Promise<TodoItem | null> {
        try {
            const { resource } = await this.container.item(id, id).read();
            return resource as TodoItem || null;
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }

    async create(todoItem: Partial<TodoItem>): Promise<TodoItem> {
        const id = uuidv4();
        const now = new Date();
        const newTodoItem: TodoItem = {
            id,
            listId: todoItem.listId || "",
            name: todoItem.name || "",
            state: todoItem.state || TodoItemState.Todo,
            description: todoItem.description,
            dueDate: todoItem.dueDate,
            completedDate: todoItem.completedDate,
            createdDate: now,
            updatedDate: now,
        };

        const { resource } = await this.container.items.create(newTodoItem);
        if (!resource) {
            throw new Error("Failed to create todo item");
        }
        return resource as TodoItem;
    }

    async update(id: string, todoItem: Partial<TodoItem>): Promise<TodoItem | null> {
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }

        const updated: TodoItem = {
            ...existing,
            ...todoItem,
            id, // Ensure ID doesn't change
            updatedDate: new Date(),
        };

        const { resource } = await this.container.item(id, id).replace(updated);
        return resource as TodoItem || null;
    }

    async delete(id: string): Promise<boolean> {
        try {
            await this.container.item(id, id).delete();
            return true;
        } catch (error: any) {
            if (error.code === 404) {
                return false;
            }
            throw error;
        }
    }

    async deleteByListId(listId: string): Promise<number> {
        const items = await this.findByListId(listId);
        let deletedCount = 0;

        for (const item of items) {
            const deleted = await this.delete(item.id);
            if (deleted) {
                deletedCount++;
            }
        }

        return deletedCount;
    }
}