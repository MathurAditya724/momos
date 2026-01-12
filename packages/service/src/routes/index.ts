import { Hono } from "hono";
import generate from "./generate";
import run from "./run";

const router = new Hono();

router.route("/generate", generate);
router.route("/run", run);

export default router;
