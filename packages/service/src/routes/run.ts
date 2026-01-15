import { getSandbox } from "@cloudflare/sandbox";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { z } from "zod";
import { actionScriptSchema } from "../schemas";
import type { Env } from "../types/env";
import type { SpotlightData } from "../types/spotlight";
import type { TraceData } from "../types/trace";
import { parseScript } from "../utils/script-parser";

// Markers for extracting trace and spotlight data from stdout
const TRACE_START_MARKER = "__TRACE_START__";
const TRACE_END_MARKER = "__TRACE_END__";
const SPOTLIGHT_START_MARKER = "__SPOTLIGHT_START__";
const SPOTLIGHT_END_MARKER = "__SPOTLIGHT_END__";

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
 * Parse trace and spotlight data from stdout
 */
function parseDataFromStdout(stdout: string): {
  trace: TraceData | null;
  spotlight: SpotlightData | null;
  cleanStdout: string;
} {
  let cleanStdout = stdout;
  let trace: TraceData | null = null;
  let spotlight: SpotlightData | null = null;

  // Parse Trace
  const traceRegex = new RegExp(
    `${TRACE_START_MARKER}([\\s\\S]*?)${TRACE_END_MARKER}`
  );
  const traceMatch = cleanStdout.match(traceRegex);

  if (traceMatch) {
    try {
      trace = JSON.parse(traceMatch[1].trim());
      cleanStdout = cleanStdout.replace(traceRegex, "").trim();
    } catch (e) {
      console.error("Failed to parse trace data:", e);
    }
  }

  // Parse Spotlight
  const spotlightRegex = new RegExp(
    `${SPOTLIGHT_START_MARKER}([\\s\\S]*?)${SPOTLIGHT_END_MARKER}`
  );
  const spotlightMatch = cleanStdout.match(spotlightRegex);

  if (spotlightMatch) {
    try {
      spotlight = JSON.parse(spotlightMatch[1].trim());
      cleanStdout = cleanStdout.replace(spotlightRegex, "").trim();
    } catch (e) {
      console.error("Failed to parse spotlight data:", e);
    }
  }

  return { trace, spotlight, cleanStdout };
}

/**
 * Generate the script template with trace capture
 */
function generateScriptWithTrace(
  webSocketDebuggerUrl: string,
  actionCode: string
): string {
  return `import { chromium } from 'playwright';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createSpotlightBuffer, pushToSpotlightBuffer } from '@spotlightjs/spotlight/sdk';

// Initialize Spotlight Server
const buffer = createSpotlightBuffer(1000);
const app = new Hono();

app.use(cors());

app.post('/stream', async (c) => {
  let contentType = c.req.header('content-type')?.split(';')[0].toLowerCase();
  
  if (c.req.query('sentry_client')?.startsWith('sentry.javascript.browser')) {
    contentType = 'application/x-sentry-envelope';
  }

  const container = pushToSpotlightBuffer({
    spotlightBuffer: buffer,
    body: Buffer.from(await c.req.arrayBuffer()),
    encoding: c.req.header('Content-Encoding'),
    contentType,
    userAgent: c.req.header('User-Agent'),
  });

  return c.body(null, 200);
});

const server = serve({ fetch: app.fetch, port: 8969 });
console.log('Spotlight server started on port 8969');

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
  page.on('console', msg => console.log(msg.text()));
  page.on("request", req => console.log(req.url()));

  // Inject Sentry/Spotlight on every page navigation via addInitScript
  await page.addInitScript(() => {
    // Skip if already initialized
    if (window.__sentryInitialized) return;
    window.__sentryInitialized = true;

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    async function initSentry() {
      try {
        // Load both scripts
        await loadScript('https://browser.sentry-cdn.com/10.33.0/bundle.tracing.min.js');
        await loadScript('https://browser.sentry-cdn.com/10.33.0/spotlight.min.js');

        // Initialize Sentry
        if (window.Sentry) {
          window.Sentry.init({
            dsn: "",
            sendDefaultPii: true,
            spotlight: true,
            enableLogs: true,
            integrations: [
              window.Sentry.browserTracingIntegration(),
              window.Sentry.spotlightBrowserIntegration()
            ],
            tracesSampleRate: 1.0,
          });
          console.log("Sentry initialized in page");
        }
      } catch (e) {
        console.error("Failed to initialize Sentry:", e);
      }
    }

    // Wait for head to be available, then initialize
    if (document.head) {
      initSentry();
    } else {
      document.addEventListener('DOMContentLoaded', initSentry);
    }
  });

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

    // Output Spotlight data
    const events = buffer.read();
    // Serialize events to JSON (convert buffers/maps to plain objects if needed)
    const spotlightData = events.map(container => ({
      envelopeId: container.getParsedEnvelope().envelope[0].event_id,
      timestamp: Date.now(), // Approximate if not in header
      type: container.getEventTypesString(),
      data: container.getParsedEnvelope(),
      headers: {} 
    }));
    
    console.log('${SPOTLIGHT_START_MARKER}' + JSON.stringify(spotlightData) + '${SPOTLIGHT_END_MARKER}');

    await browser.close();
    server.close(); 
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

    // Parse trace and spotlight from stdout
    const { trace, spotlight, cleanStdout } = parseDataFromStdout(
      result.stdout
    );

    return Response.json({
      exitCode: result.exitCode,
      stdout: cleanStdout,
      stderr: result.stderr,
      trace,
      spotlight,
    });
  }
);

export default router;
