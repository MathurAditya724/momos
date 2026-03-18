import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { nanoid } from "nanoid";
import * as schema from "./schema";

export { migrate } from "./migrate";
export * from "./schema";

// Re-export nanoid as generateId for consistent API
export const generateId = nanoid;

// Default database path: ~/.momos/data.db
export function getDefaultDbPath(): string {
  return join(homedir(), ".momos", "data.db");
}

export type Db = ReturnType<typeof createDb>;

export function createDb(dbPath?: string) {
  const path = dbPath ?? getDefaultDbPath();

  // Ensure directory exists
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const client = createClient({
    url: `file:${path}`,
  });

  return drizzle(client, { schema });
}
