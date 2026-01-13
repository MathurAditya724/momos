import { getSandbox } from "@cloudflare/sandbox";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { z } from "zod";
import { actionScriptSchema } from "../schemas";
import type { Env } from "../types/env";
import { parseScript } from "../utils/script-parser";

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3) {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error("Failed to execute function after retries");
}

const router = new Hono<Env>().post(
  "/",
  sValidator(
    "json",
    z.object({
      script: actionScriptSchema,
    })
  ),
  async (c) => {
    const { script } = c.req.valid("json");

    // Get or create a sandbox instance
    const sandbox = getSandbox(c.env.Sandbox, "my-sandbox");

    // health check until the browser is ready
    const fetchVersion = await retryWithBackoff(async () => {
      const result = await sandbox.exec(
        "curl -s http://localhost:9222/json/version"
      );

      if (result.exitCode !== 0) {
        throw new Error("Failed to fetch version");
      }

      return result;
    }, 10);

    const data = JSON.parse(fetchVersion.stdout);
    const { webSocketDebuggerUrl } = data;

    await sandbox.writeFile(
      "/workspace/index.js",
      `import { chromium } from 'playwright';

   async function main() {
    const browser = await chromium.connectOverCDP('${webSocketDebuggerUrl}');
    const page = await browser.newPage()
    ${parseScript(script)}
    await browser.close();
  }
    main();`
    );

    const result = await sandbox.exec("node /workspace/index.js");
    return Response.json(result);
  }
);

export default router;
