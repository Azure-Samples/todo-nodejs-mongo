import { getTodoListContainer } from "./cosmosClient";
import { TodoList } from "./todoList";
import { v4 as uuidv4 } from "uuid";

export class TodoListRepository {
    private container = getTodoListContainer();

    async findAll(): Promise<TodoList[]> {
        const { resources } = await this.container.items.readAll().fetchAll();
        return resources as TodoList[];
    }

    async findById(id: string): Promise<TodoList | null> {
        try {
            const { resource } = await this.container.item(id, id).read();
            return resource as TodoList || null;
        } catch (error: any) {
            if (error.code === 404) {
                return null;
            }
            throw error;
        }
    }

    async create(todoList: Partial<TodoList>): Promise<TodoList> {
        const id = uuidv4();
        const now = new Date();
        const newTodoList: TodoList = {
            id,
            name: todoList.name || "",
            description: todoList.description,
            createdDate: now,
            updatedDate: now,
        };

        const { resource } = await this.container.items.create(newTodoList);
        if (!resource) {
            throw new Error("Failed to create todo list");
        }
        return resource as TodoList;
    }

    async update(id: string, todoList: Partial<TodoList>): Promise<TodoList | null> {
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }

        const updated: TodoList = {
            ...existing,
            ...todoList,
            id, // Ensure ID doesn't change
            updatedDate: new Date(),
        };

        const { resource } = await this.container.item(id, id).replace(updated);
        return resource as TodoList || null;
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
}