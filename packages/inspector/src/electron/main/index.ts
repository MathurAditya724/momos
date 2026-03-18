import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { app, BrowserWindow } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 6274;
const cwd = process.cwd();

// Migrations folder is at dist/drizzle (relative to dist-electron/main/)
const migrationsFolder = path.join(__dirname, "../../dist/drizzle");

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let serverStarted = false;
let serverFailed = false;

const isLinux = process.platform === "linux";

async function checkHealth(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function startServer(): Promise<void> {
  // Check if server is already running
  const isRunning = await checkHealth(PORT);

  if (isRunning) {
    console.log(`Server is already running at http://localhost:${PORT}`);
    serverStarted = true;
    return;
  }

  // Import the built server app
  // In production, this will be at ../../dist/index.js relative to dist-electron/main/
  // In development, we use the dev server URL directly
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    // In dev mode, the vite dev server handles the API
    // We don't need to start the server
    serverStarted = true;
    return;
  }

  try {
    // Dynamic import of the built server
    const serverPath = path.join(__dirname, "../../dist/index.js");
    const { default: createApp } = await import(serverPath);

    // Server handles DB initialization internally via middleware
    const honoApp = createApp({ cwd, migrationsFolder });

    serve(
      {
        fetch: honoApp.fetch,
        port: PORT,
      },
      (info) => {
        console.log(`Server running at http://localhost:${info.port}`);
        serverStarted = true;
      },
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    // Mark as failed but allow the app to continue
    // The renderer might still work if connecting to an external server
    serverFailed = true;
  }
}

async function waitForServer(maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkHealth(PORT)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

app.whenReady().then(async () => {
  await startServer();

  // Wait for server to be ready if we started it (skip if it failed)
  if (!serverFailed && (!app.isPackaged || serverStarted)) {
    await waitForServer();
  }

  createWindow();
  app.on("activate", () => {
    showOrCreateWindow();
  });
});

// only quit on linux as trays may not be available on all desktop environments
app.on("window-all-closed", () => {
  if (isLinux) {
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Momos",
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    // In production, load from the server
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  mainWindow.once("ready-to-show", () => {
    if (!mainWindow) return;

    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("close", (event) => {
    // Linux: always quit when window is closed, some desktop environments don't support tray apps like gnome
    if (!isQuitting && !isLinux) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on("did-finish-load", () => {
    app.setBadgeCount(0);
  });
}

function showOrCreateWindow() {
  if (isQuitting) {
    return;
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}
