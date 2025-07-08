import express from "express";
import { Request } from "express";
import { PagingQueryParams } from "../routes/common";
import { TodoItem, TodoItemState } from "../models/todoItem";
import { TodoItemRepository } from "../models/todoItemRepository";

const router = express.Router({ mergeParams: true });

type TodoItemPathParams = {
    listId: string
    itemId: string
    state?: TodoItemState
}

/**
 * Gets a list of Todo item within a list
 */
router.get("/", async (req: Request<TodoItemPathParams, unknown, unknown, PagingQueryParams>, res) => {
    try {
        const repository = new TodoItemRepository();
        const items = await repository.findByListId(req.params.listId);
        
        // Apply pagination
        const skip = req.query.skip ? parseInt(req.query.skip) : 0;
        const top = req.query.top ? parseInt(req.query.top) : 20;
        const paginatedItems = items.slice(skip, skip + top);
        
        res.json(paginatedItems);
    } catch (err) {
        console.error("Error fetching items:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Creates a new Todo item within a list
 */
router.post("/", async (req: Request<TodoItemPathParams, unknown, TodoItem>, res) => {
    try {
        const repository = new TodoItemRepository();
        const item = await repository.create({
            ...req.body,
            listId: req.params.listId
        });

        res.setHeader("location", `${req.protocol}://${req.get("Host")}/lists/${req.params.listId}/${item.id}`);
        res.status(201).json(item);
    } catch (err) {
        console.error("Error creating item:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Gets a Todo item with the specified ID within a list
 */
router.get("/:itemId", async (req: Request<TodoItemPathParams>, res) => {
    try {
        const repository = new TodoItemRepository();
        const item = await repository.findById(req.params.itemId);

        if (!item || item.listId !== req.params.listId) {
            return res.status(404).send();
        }

        res.json(item);
    } catch (err) {
        console.error("Error fetching item:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Updates a Todo item with the specified ID within a list
 */
router.put("/:itemId", async (req: Request<TodoItemPathParams, unknown, TodoItem>, res) => {
    try {
        const repository = new TodoItemRepository();
        const updated = await repository.update(req.params.itemId, {
            ...req.body,
            listId: req.params.listId
        });

        if (!updated) {
            return res.status(404).send();
        }

        res.json(updated);
    } catch (err) {
        console.error("Error updating item:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Deletes a Todo item with the specified ID within a list
 */
router.delete("/:itemId", async (req, res) => {
    try {
        const repository = new TodoItemRepository();
        const deleted = await repository.delete(req.params.itemId);

        if (!deleted) {
            return res.status(404).send();
        }

        res.status(204).send();
    } catch (err) {
        console.error("Error deleting item:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * Get a list of items by state
 */
router.get("/state/:state", async (req: Request<TodoItemPathParams, unknown, unknown, PagingQueryParams>, res) => {
    try {
        const repository = new TodoItemRepository();
        const items = await repository.findByListId(req.params.listId);
        
        // Filter by state
        const filteredItems = items.filter(item => item.state === req.params.state);
        
        // Apply pagination
        const skip = req.query.skip ? parseInt(req.query.skip) : 0;
        const top = req.query.top ? parseInt(req.query.top) : 20;
        const paginatedItems = filteredItems.slice(skip, skip + top);
        
        res.json(paginatedItems);
    } catch (err) {
        console.error("Error fetching items by state:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.put("/state/:state", async (req: Request<TodoItemPathParams, unknown, string[]>, res) => {
    try {
        const repository = new TodoItemRepository();
        const completedDate = req.params.state === TodoItemState.Done ? new Date() : undefined;

        const updateTasks = req.body.map(async (id) => {
            const item = await repository.findById(id);
            if (!item || item.listId !== req.params.listId) {
                throw new Error(`Item ${id} not found or doesn't belong to list ${req.params.listId}`);
            }
            
            return repository.update(id, { 
                state: req.params.state as TodoItemState, 
                completedDate: completedDate 
            });
        });

        await Promise.all(updateTasks);

        res.status(204).send();
    } catch (err) {
        console.error("Error updating items state:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;