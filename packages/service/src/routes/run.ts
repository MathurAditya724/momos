import { getSandbox } from "@cloudflare/sandbox";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { z } from "zod";
import { actionScriptSchema } from "../schemas";
import type { Env } from "../types/env";
import type { TraceData } from "../types/trace";
import { parseScript } from "../utils/script-parser";

// Markers for extracting trace data from stdout
const TRACE_START_MARKER = "__TRACE_START__";
const TRACE_END_MARKER = "__TRACE_END__";

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

/**
 * Parse trace data from stdout
 */
function parseTraceFromStdout(stdout: string): {
  trace: TraceData | null;
  cleanStdout: string;
} {
  const traceRegex = new RegExp(
    `${TRACE_START_MARKER}([\\s\\S]*?)${TRACE_END_MARKER}`
  );
  const match = stdout.match(traceRegex);

  if (!match) {
    return { trace: null, cleanStdout: stdout };
  }

  let trace: TraceData | null = null;
  try {
    trace = JSON.parse(match[1].trim());
  } catch (e) {
    console.error("Failed to parse trace data:", e);
  }

  // Remove trace data from stdout
  const cleanStdout = stdout.replace(traceRegex, "").trim();

  return { trace, cleanStdout };
}

/**
 * Generate the script template with trace capture
 */
function generateScriptWithTrace(
  webSocketDebuggerUrl: string,
  actionCode: string
): string {
  return `import { chromium } from 'playwright';

// Trace data structure
const trace = {
  startTime: Date.now(),
  endTime: 0,
  duration: 0,
  success: false,
  error: null,
  steps: []
};

async function main() {
  const browser = await chromium.connectOverCDP('${webSocketDebuggerUrl}');
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  // Helper function to capture a step
  async function captureStep(index, action, details) {
    try {
      // Get screenshot as buffer first, then convert to base64
      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 60
      });
      
      // Convert buffer to base64 string
      const screenshot = screenshotBuffer.toString('base64');

      trace.steps.push({
        index,
        action,
        details,
        timestamp: Date.now(),
        screenshot,
        url: page.url()
      });
      
      console.log('Captured step ' + index + ': ' + action + ' (' + Math.round(screenshot.length / 1024) + 'KB)');
    } catch (e) {
      console.error('Failed to capture step:', e.message);
    }
  }

  try {
    ${actionCode}
    trace.success = true;
  } catch (error) {
    trace.success = false;
    trace.error = error.message;
    console.error('Script error:', error.message);
    
    // Try to capture final state on error
    try {
      await captureStep(trace.steps.length, 'error', error.message);
    } catch {}
  } finally {
    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;

    // Output trace as JSON with markers
    console.log('${TRACE_START_MARKER}' + JSON.stringify(trace) + '${TRACE_END_MARKER}');

    await browser.close();
  }
}

main();`;
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

    // Health check until the browser is ready
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

    // Generate script with trace capture
    const actionCode = parseScript(script);
    const fullScript = generateScriptWithTrace(
      webSocketDebuggerUrl,
      actionCode
    );

    await sandbox.writeFile("/workspace/index.js", fullScript);

    const result = await sandbox.exec("node /workspace/index.js");

    // Parse trace from stdout
    const { trace, cleanStdout } = parseTraceFromStdout(result.stdout);

    return Response.json({
      exitCode: result.exitCode,
      stdout: cleanStdout,
      stderr: result.stderr,
      trace,
    });
  }
);

export default router;
