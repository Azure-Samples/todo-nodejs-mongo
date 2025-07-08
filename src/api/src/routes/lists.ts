import express, { Request } from "express";
import { PagingQueryParams } from "../routes/common";
import { TodoList } from "../models/todoList";
import { TodoListRepository } from "../models/todoListRepository";
import { TodoItemRepository } from "../models/todoItemRepository";

const router = express.Router();

type TodoListPathParams = {
    listId: string
}

/**
 * Gets a list of Todo list
 */
router.get("/", async (req: Request<unknown, unknown, unknown, PagingQueryParams>, res) => {
    try {
        const repository = new TodoListRepository();
        const lists = await repository.findAll();
        
        // Apply pagination
        const skip = req.query.skip ? parseInt(req.query.skip) : 0;
        const top = req.query.top ? parseInt(req.query.top) : 20;
        const paginatedLists = lists.slice(skip, skip + top);
        
        res.json(paginatedLists);
    } catch (err) {
        console.error("Error fetching lists:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Creates a new Todo list
 */
router.post("/", async (req: Request<unknown, unknown, TodoList>, res) => {
    try {
        const repository = new TodoListRepository();
        const list = await repository.create(req.body);

        res.setHeader("location", `${req.protocol}://${req.get("Host")}/lists/${list.id}`);
        res.status(201).json(list);
    } catch (err) {
        console.error("Error creating list:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Gets a Todo list with the specified ID
 */
router.get("/:listId", async (req: Request<TodoListPathParams>, res) => {
    try {
        const repository = new TodoListRepository();
        const list = await repository.findById(req.params.listId);

        if (!list) {
            return res.status(404).send();
        }

        res.json(list);
    } catch (err) {
        console.error("Error fetching list:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Updates a Todo list with the specified ID
 */
router.put("/:listId", async (req: Request<TodoListPathParams, unknown, TodoList>, res) => {
    try {
        const repository = new TodoListRepository();
        const updated = await repository.update(req.params.listId, req.body);

        if (!updated) {
            return res.status(404).send();
        }

        res.json(updated);
    } catch (err) {
        console.error("Error updating list:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Deletes a Todo list with the specified ID
 */
router.delete("/:listId", async (req: Request<TodoListPathParams>, res) => {
    try {
        const listRepository = new TodoListRepository();
        const itemRepository = new TodoItemRepository();
        
        // First delete all items in the list
        await itemRepository.deleteByListId(req.params.listId);
        
        // Then delete the list itself
        const deleted = await listRepository.delete(req.params.listId);

        if (!deleted) {
            return res.status(404).send();
        }

        res.status(204).send();
    } catch (err) {
        console.error("Error deleting list:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;