import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import { DEFAULT_PORT, IPC_CHANNELS } from "../../shared/constants";
import { checkHealth, getServerUrl } from "../../shared/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || DEFAULT_PORT;

// Migrations folder is at dist/drizzle (relative to dist-electron/main/)
const migrationsFolder = path.join(__dirname, "../../dist/drizzle");

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let serverStarted = false;
let serverFailed = false;

const isLinux = process.platform === "linux";

// Register IPC handlers for renderer communication
function registerIpcHandlers() {
  // Open native folder dialog
  ipcMain.handle(IPC_CHANNELS.SELECT_FOLDER, async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.canceled ? null : result.filePaths[0];
  });
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: "Settings...",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            mainWindow?.webContents.send(IPC_CHANNELS.OPEN_SETTINGS);
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function startServer(): Promise<void> {
  const serverUrl = getServerUrl(PORT);

  // Check if server is already running
  const isRunning = await checkHealth(serverUrl);

  if (isRunning) {
    console.log(`Server is already running at ${serverUrl}`);
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
    const honoApp = createApp({ cwd: process.cwd(), migrationsFolder });

    serve(
      {
        fetch: honoApp.fetch,
        port: PORT,
      },
      (info) => {
        console.log(`Server running at ${getServerUrl(info.port)}`);
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
  const serverUrl = getServerUrl(PORT);

  for (let i = 0; i < maxAttempts; i++) {
    if (await checkHealth(serverUrl)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}

app.whenReady().then(async () => {
  // Register IPC handlers before creating window
  registerIpcHandlers();
  buildMenu();

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
    mainWindow.loadURL(getServerUrl(PORT));
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
