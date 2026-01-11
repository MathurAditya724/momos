import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {});

// This is used to determine if the UI is running inside electron
contextBridge.exposeInMainWorld("IS_ELECTRON", true);
