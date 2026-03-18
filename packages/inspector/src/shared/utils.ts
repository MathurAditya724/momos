import { DEFAULT_PORT, HEALTH_ENDPOINT, STORAGE_KEYS } from "./constants";

export type WorkspaceContext = {
  path: string;
  serverUrl?: string | null;
};

export function getBaseUrl(workspace?: WorkspaceContext | null): string {
  if (workspace?.serverUrl) {
    return workspace.serverUrl;
  }

  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEYS.REMOTE_URL) || "";
  }

  return "";
}

export function getServerUrl(port = DEFAULT_PORT): string {
  return `http://localhost:${port}`;
}

export function getCwd(workspace?: WorkspaceContext | null): string | null {
  return workspace?.path ?? null;
}

/**
 * Check if a server is healthy at the given URL
 * Reusable across CLI, Electron main process, and frontend
 */
export async function checkHealth(
  baseUrl: string,
  timeout = 3000,
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = baseUrl.endsWith("/")
      ? `${baseUrl.slice(0, -1)}${HEALTH_ENDPOINT}`
      : `${baseUrl}${HEALTH_ENDPOINT}`;

    const response = await fetch(url, {
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract repository name from a git URL
 * Handles HTTPS, SSH, and various git hosting URLs
 */
export function extractRepoName(gitUrl: string): string {
  // Remove trailing .git if present
  let url = gitUrl.replace(/\.git$/, "");

  // Handle SSH URLs (git@github.com:user/repo)
  if (url.includes("@") && url.includes(":")) {
    const parts = url.split(":");
    url = parts[parts.length - 1];
  }

  // Get the last part of the path
  const parts = url.split("/");
  return parts[parts.length - 1] || "repository";
}
