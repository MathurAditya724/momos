import { execFile } from "node:child_process";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { config as configTable } from "../../server/db/schema";
import type { AppEnv } from "../../server/types";

const DEFAULT_CONFIG_ID = "default";

type WorkspaceEnv = AppEnv & {
  Variables: AppEnv["Variables"] & {
    workspace: {
      id: string;
      path: string;
      metadata?: { github?: boolean; sentry?: boolean } | null;
    };
  };
};

const router = new Hono<WorkspaceEnv>();

router.get("/issues", async (c) => {
  const db = c.get("db");
  const workspace = c.get("workspace");

  // Check if GitHub is disabled for this workspace
  if (workspace.metadata?.github === false) {
    return c.json({ error: "disabled_for_workspace" }, 403);
  }

  // Check if GitHub is enabled in config
  const configResult = await db
    .select()
    .from(configTable)
    .where(eq(configTable.id, DEFAULT_CONFIG_ID))
    .limit(1);

  const configData = configResult[0]?.data;
  if (!configData?.github) {
    return c.json({ error: "not_enabled" }, 403);
  }

  // Run gh issue list in the workspace directory
  const result = await new Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }>((resolve) => {
    execFile(
      "gh",
      [
        "issue",
        "list",
        "--json",
        "number,title,state,updatedAt,labels,url",
        "--limit",
        "10",
      ],
      { cwd: workspace.path },
      (error, stdout, stderr) => {
        if (error) {
          // Check if gh is not installed
          if (
            error.message.includes("ENOENT") ||
            error.message.includes("not found")
          ) {
            resolve({ success: false, error: "not_installed" });
            return;
          }
          resolve({ success: false, error: stderr || error.message });
          return;
        }
        resolve({ success: true, data: stdout });
      },
    );
  });

  if (!result.success) {
    if (result.error === "not_installed") {
      return c.json({ error: "not_installed" }, 503);
    }
    return c.json(
      { error: result.error ?? "Failed to fetch GitHub issues" },
      500,
    );
  }

  try {
    const issues = JSON.parse(result.data ?? "[]");
    return c.json({ data: issues });
  } catch {
    return c.json({ error: "Failed to parse GitHub issues" }, 500);
  }
});

export default router;
