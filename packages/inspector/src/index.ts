import { Hono } from "hono";
import { logger } from "hono/logger";
import routes from "./routes";

const app = new Hono().use(logger());

app.route("/", routes);

export default app;
