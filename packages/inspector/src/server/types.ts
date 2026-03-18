import type { Db } from "./db";

export type AppConfig = {
  cwd?: string;
  migrationsFolder: string;
};

export type AppEnv = {
  Variables: {
    config: AppConfig;
    db: Db;
  };
};
