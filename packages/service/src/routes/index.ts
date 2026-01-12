import { Hono } from "hono";
import generate from "./generate";
import run from "./run";

const router = new Hono().route("/generate", generate).route("/run", run);

export default router;
