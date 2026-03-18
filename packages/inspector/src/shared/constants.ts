// IPC Channel Keys - single source of truth for Electron IPC communication
export const IPC_CHANNELS = {
  SELECT_FOLDER: "select-folder",
  OPEN_SETTINGS: "open-settings",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

// LocalStorage Keys - for persisting user preferences
export const STORAGE_KEYS = {
  REMOTE_URL: "momos_remote_url",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// Server defaults
export const DEFAULT_PORT = 6274;
export const HEALTH_ENDPOINT = "/health";
