export type ElectronAPI = {};

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    IS_ELECTRON: boolean;
  }
}
