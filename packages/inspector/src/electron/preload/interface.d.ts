export type ElectronAPI = {
  selectFolder: () => Promise<string | null>;
  onOpenSettings: (callback: () => void) => () => void;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
