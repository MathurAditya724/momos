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

function checkCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("which", [command], (error) => {
      resolve(!error);
    });
  });
}

const router = new Hono<WorkspaceEnv>();

// GET / — merged tool status for this workspace
router.get("/", async (c) => {
  const db = c.get("db");
  const workspace = c.get("workspace");

  const [ghInstalled, sentryInstalled, configResult] = await Promise.all([
    checkCommand("gh"),
    checkCommand("sentry"),
    db
      .select()
      .from(configTable)
      .where(eq(configTable.id, DEFAULT_CONFIG_ID))
      .limit(1),
  ]);

  const configData = configResult[0]?.data;
  const metadata = workspace.metadata;

  return c.json({
    github: {
      installed: ghInstalled,
      globalEnabled: configData?.github === true,
      workspaceEnabled: metadata?.github !== false,
    },
    sentry: {
      installed: sentryInstalled,
      globalEnabled: configData?.sentry === true,
      workspaceEnabled: metadata?.sentry !== false,
    },
  });
});

export default router;
