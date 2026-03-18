#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { DEFAULT_PORT } from "./shared/constants";
import { checkHealth, getServerUrl } from "./shared/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || DEFAULT_PORT;
const cwd = process.cwd();

// Migrations folder is at dist/drizzle (copied during build)
// When running from dist/cli.js, __dirname is dist/, so drizzle/ is a sibling
const migrationsFolder = join(__dirname, "drizzle");

async function main() {
  const serverUrl = getServerUrl(PORT);

  // Check if server is already running
  const isRunning = await checkHealth(serverUrl);

  if (isRunning) {
    console.log(`Server is already running at ${serverUrl}`);
    console.log(`Working directory: ${cwd}`);
    return;
  }

  // Dynamic import of the built app (this works after build)
  let createApp: (config: { cwd: string; migrationsFolder: string }) => {
    fetch: typeof fetch;
  };

  try {
    // Try to import the built version first
    const module = await import("../dist/index.js");
    createApp = module.default;
  } catch {
    console.error("Built server not found. Please run 'bun run build' first.");
    process.exit(1);
  }

  // Server handles DB initialization internally via middleware
  const app = createApp({ cwd, migrationsFolder });

  console.log(`Starting Momos...`);
  console.log(`Working directory: ${cwd}`);

  serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      console.log(`Server running at ${getServerUrl(info.port)}`);
    },
  );
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
