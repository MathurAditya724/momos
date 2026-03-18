import { createMiddleware } from "hono/factory";
import { createDb, type Db, migrate } from "../db";
import type { AppEnv } from "../types";

// Singleton DB management
let dbInitPromise: Promise<Db> | null = null;

function initializeDb(migrationsFolder: string): Promise<Db> {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      const db = createDb();
      await migrate(db, migrationsFolder);
      return db;
    })();
  }
  return dbInitPromise;
}

/**
 * Initialization middleware - handles all startup tasks:
 * - Database initialization & migrations
 * - Sets `db` in request context for easy access
 *
 * Future init steps can be added here (caching, etc.)
 */
export const initMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const config = c.get("config");

  // Initialize DB (lazy, cached via promise)
  const db = await initializeDb(config.migrationsFolder);
  c.set("db", db);

  await next();
});
