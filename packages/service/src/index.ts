import { Hono } from "hono";
import routes from "./routes";

export { Sandbox } from "@cloudflare/sandbox";

const app = new Hono().route("/", routes);

export default app;
