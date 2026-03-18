import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import pkg from "../../package.json";
import type { AppEnv } from "../server/types";
import configRoutes from "./config";
import healthRoutes from "./health";
import workspaceRoutes from "./workspace";

const routes = new Hono<AppEnv>();

// Mount sub-routes
routes.route("/health", healthRoutes);
routes.route("/api/config", configRoutes);
routes.route("/api/workspaces", workspaceRoutes);

// Version endpoint
routes.get("/version", (c) => c.text(pkg.version));

if (import.meta.env.DEV) {
  routes.use(
    serveStatic({
      path: "./index.html",
    }),
  );
}

export default routes;
