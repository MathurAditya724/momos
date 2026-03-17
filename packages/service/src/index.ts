import { Hono } from "hono";
import { cors } from "hono/cors";
import routes from "./routes";

const app = new Hono()
  .use(
    cors({
      origin: (origin) => origin,
      credentials: true,
    }),
  )
  .route("/", routes);

export default app;
