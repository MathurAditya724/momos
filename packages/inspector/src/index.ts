import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import routes from "./routes";
import { initMiddleware } from "./server/middlewares/init";
import type { AppEnv } from "./server/types";

const app = new Hono<AppEnv>().use(logger(), cors());

// Middleware to ensure config is set (for dev mode)
// In production, config is set by CLI/Electron before routing
app.use(async (c, next) => {
  if (!c.get("config")) {
    c.set("config", {
      cwd: process.cwd(),
      migrationsFolder: join(process.cwd(), "drizzle"),
    });
  }
  await next();
});

// Initialize DB and other services
app.use(initMiddleware);

app.route("/", routes);

export default app;
