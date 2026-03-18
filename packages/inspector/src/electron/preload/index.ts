import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../../shared/constants";

contextBridge.exposeInMainWorld("electronAPI", {
  selectFolder: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FOLDER),
  onOpenSettings: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.OPEN_SETTINGS, listener);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.OPEN_SETTINGS, listener);
    };
  },
});
