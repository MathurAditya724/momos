import { sValidator } from "@hono/standard-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { config as configTable } from "../../server/db/schema";
import { updateConfigSchema } from "../../server/schemas";
import type { AppEnv } from "../../server/types";

const DEFAULT_CONFIG_ID = "default";

const router = new Hono<AppEnv>();

// Get the config
router.get("/", async (c) => {
  const db = c.get("db");

  const result = await db
    .select()
    .from(configTable)
    .where(eq(configTable.id, DEFAULT_CONFIG_ID))
    .limit(1);

  if (result.length === 0) {
    // Return empty config if not exists
    return c.json({
      id: DEFAULT_CONFIG_ID,
      data: {},
      createdAt: null,
      updatedAt: null,
    });
  }

  return c.json(result[0]);
});

// Update the config (upsert)
router.put("/", sValidator("json", updateConfigSchema), async (c) => {
  const db = c.get("db");
  const body = c.req.valid("json");

  // Get existing config to merge
  const existing = await db
    .select()
    .from(configTable)
    .where(eq(configTable.id, DEFAULT_CONFIG_ID))
    .limit(1);

  const existingData = existing[0]?.data ?? {};
  const mergedData = { ...existingData, ...body.data };

  const result = await db
    .insert(configTable)
    .values({
      id: DEFAULT_CONFIG_ID,
      data: mergedData,
    })
    .onConflictDoUpdate({
      target: configTable.id,
      set: {
        data: mergedData,
        updatedAt: new Date(),
      },
    })
    .returning();

  return c.json(result[0]);
});

export default router;
