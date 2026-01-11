import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

const isLinux = process.platform === "linux";

app.whenReady().then(() => {
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
    title: "Momos Inspector",
    // frame: false,
    // resizable: false,
    // maximizable: false,
    // transparent: true,
    // webPreferences: { nodeIntegration: true },
    titleBarStyle: "hidden",
    // titleBarOverlay: {
    //   color: '#2f3241',
    //   symbolColor: '#74b1be',
    //   height: 60,
    // },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      sandbox: false,
    },
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
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
