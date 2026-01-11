import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import pkg from "../../package.json";

const routes = new Hono();

routes.get("/version", (c) => c.text(pkg.version));

if (import.meta.env.DEV) {
  routes.use(
    serveStatic({
      path: "./index.html",
    }),
  );
}

export default routes;
