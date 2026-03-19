import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { sValidator } from "@hono/standard-validator";
import { count, desc, eq, like } from "drizzle-orm";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import {
  generateId,
  type Workspace,
  workspace as workspaceTable,
} from "../../server/db";
import {
  cloneWorkspaceSchema,
  createWorkspaceSchema,
  idParamSchema,
  listWorkspacesQuerySchema,
  updateWorkspaceSchema,
} from "../../server/schemas";
import type { AppEnv } from "../../server/types";
import githubRoutes from "./github";
import sentryRoutes from "./sentry";
import statusRoutes from "./status";

type WorkspaceEnv = AppEnv & {
  Variables: AppEnv["Variables"] & {
    workspace: Workspace;
  };
};

/**
 * Middleware that validates and loads a workspace by :id param.
 * Checks that the workspace exists in DB and its path exists on disk.
 * Sets c.var.workspace for downstream handlers.
 */
export const workspaceMiddleware = createMiddleware<WorkspaceEnv>(
  async (c, next) => {
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Workspace ID is required" }, 400);
    }

    const db = c.get("db");

    const result = await db
      .select()
      .from(workspaceTable)
      .where(eq(workspaceTable.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    const workspace = result[0];
    if (!existsSync(workspace.path)) {
      await db.delete(workspaceTable).where(eq(workspaceTable.id, id));
      return c.json({ error: "Workspace path no longer exists" }, 410);
    }

    c.set("workspace", workspace);
    await next();
  },
);

const router = new Hono<AppEnv>();

// List workspaces with pagination, search, and sort
router.get("/", sValidator("query", listWorkspacesQuerySchema), async (c) => {
  const db = c.get("db");
  const { page, limit, search } = c.req.valid("query");
  const offset = (page - 1) * limit;

  // Build where clause for search
  const whereClause = search
    ? like(workspaceTable.path, `%${search}%`)
    : undefined;

  // Execute queries in parallel
  const [workspaces, countResult] = await Promise.all([
    db
      .select()
      .from(workspaceTable)
      .where(whereClause)
      .orderBy(desc(workspaceTable.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(workspaceTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;

  return c.json({
    data: workspaces,
    pagination: {
      page,
      limit,
      total,
      hasMore: offset + workspaces.length < total,
    },
  });
});

// Get a single workspace by ID (uses middleware for validation)
router.get(
  "/:id",
  sValidator("param", idParamSchema),
  workspaceMiddleware,
  async (c) => {
    const workspace = c.get("workspace");
    return c.json(workspace);
  },
);

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
    const touched = await db
      .update(workspaceTable)
      .set({ updatedAt: new Date() })
      .where(eq(workspaceTable.id, existing[0].id))
      .returning();

    return c.json(touched[0]);
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

router.post("/clone", sValidator("json", cloneWorkspaceSchema), async (c) => {
  const db = c.get("db");
  const { url, destination } = c.req.valid("json");

  const cloneResult = await new Promise<{ success: boolean; error?: string }>(
    (resolve) => {
      execFile("git", ["clone", url, destination], (error, _, stderr) => {
        if (error) {
          resolve({ success: false, error: stderr || error.message });
          return;
        }

        resolve({ success: true });
      });
    },
  );

  if (!cloneResult.success) {
    return c.json(
      { error: cloneResult.error ?? "Failed to clone repository" },
      400,
    );
  }

  const existing = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.path, destination))
    .limit(1);

  if (existing.length > 0) {
    const touched = await db
      .update(workspaceTable)
      .set({ updatedAt: new Date() })
      .where(eq(workspaceTable.id, existing[0].id))
      .returning();

    return c.json(touched[0]);
  }

  const result = await db
    .insert(workspaceTable)
    .values({
      id: generateId(),
      path: destination,
    })
    .returning();

  return c.json(result[0], 201);
});

router.patch(
  "/:id",
  sValidator("param", idParamSchema),
  sValidator("json", updateWorkspaceSchema),
  async (c) => {
    const db = c.get("db");
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const { serverUrl } = body;

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if ("serverUrl" in body) {
      updatePayload.serverUrl = serverUrl;
    }

    if ("metadata" in body && body.metadata) {
      // Merge metadata: fetch existing, spread new on top
      const current = await db
        .select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, id))
        .limit(1);

      const existingMetadata = current[0]?.metadata ?? {};
      updatePayload.metadata = { ...existingMetadata, ...body.metadata };
    }

    const result = await db
      .update(workspaceTable)
      .set(updatePayload)
      .where(eq(workspaceTable.id, id))
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json(result[0]);
  },
);

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

// Mount tool sub-routes with workspace middleware
router.use("/:id/status", workspaceMiddleware);
router.use("/:id/github/*", workspaceMiddleware);
router.use("/:id/sentry/*", workspaceMiddleware);
router.route("/:id/status", statusRoutes);
router.route("/:id/github", githubRoutes);
router.route("/:id/sentry", sentryRoutes);

export default router;
