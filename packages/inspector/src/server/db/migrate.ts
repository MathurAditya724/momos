import { migrate as drizzleMigrate } from "drizzle-orm/libsql/migrator";
import type { Db } from "./index";

const DEBUG =
  process.env.DEBUG === "true" || process.env.NODE_ENV === "development";

export async function migrate(db: Db, migrationsFolder: string): Promise<void> {
  if (DEBUG) {
    console.log(`Running migrations from ${migrationsFolder}`);
  }
  await drizzleMigrate(db, { migrationsFolder });
  if (DEBUG) {
    console.log("Database migrations completed");
  }
}
