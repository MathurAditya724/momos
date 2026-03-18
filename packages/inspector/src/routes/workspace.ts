import { sValidator } from "@hono/standard-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { generateId, workspace as workspaceTable } from "../server/db";
import { createWorkspaceSchema, idParamSchema } from "../server/schemas";
import type { AppEnv } from "../server/types";

const router = new Hono<AppEnv>();

// List all workspaces
router.get("/", async (c) => {
  const db = c.get("db");

  const workspaces = await db.select().from(workspaceTable).limit(10);

  return c.json(workspaces);
});

// Get a single workspace by ID
router.get("/:id", sValidator("param", idParamSchema), async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const result = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "Workspace not found" }, 404);
  }

  return c.json(result[0]);
});

// Create a workspace (or return existing if path already exists)
router.post("/", sValidator("json", createWorkspaceSchema), async (c) => {
  const db = c.get("db");
  const { path } = c.req.valid("json");

  // Check if workspace with this path already exists
  const existing = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.path, path))
    .limit(1);

  if (existing.length > 0) {
    // Return existing workspace
    return c.json(existing[0]);
  }

  // Create new workspace
  const result = await db
    .insert(workspaceTable)
    .values({
      id: generateId(),
      path,
    })
    .returning();

  return c.json(result[0], 201);
});

// Delete a workspace
router.delete("/:id", sValidator("param", idParamSchema), async (c) => {
  const db = c.get("db");
  const { id } = c.req.valid("param");

  const result = await db
    .delete(workspaceTable)
    .where(eq(workspaceTable.id, id))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Workspace not found" }, 404);
  }

  return c.json({ success: true });
});

export default router;
