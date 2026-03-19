import { STORAGE_KEYS } from "@/shared/constants";
import { checkHealth, extractRepoName, getBaseUrl } from "@/shared/utils";

export type Workspace = {
  id: string;
  path: string;
  serverUrl?: string | null;
  metadata?: {
    github?: boolean;
    sentry?: boolean;
    [key: string]: unknown;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Get the base URL for API requests
 * Returns the remote URL from localStorage if set, otherwise empty string (relative URLs)
 */
export function getApiBaseUrl(workspace?: Workspace | null): string {
  return getBaseUrl(workspace);
}

/**
 * Set or clear the remote URL
 */
export function setRemoteUrl(url: string | null): void {
  if (url) {
    localStorage.setItem(STORAGE_KEYS.REMOTE_URL, url);
  } else {
    localStorage.removeItem(STORAGE_KEYS.REMOTE_URL);
  }
}

/**
 * Get the currently configured remote URL (or null if using local)
 */
export function getRemoteUrl(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEYS.REMOTE_URL);
  }
  return null;
}

/**
 * Centralized API fetch function that respects the remote URL setting
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  workspace?: Workspace | null,
): Promise<T> {
  const baseUrl = getApiBaseUrl(workspace);
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.message || error.error || `API error: ${response.status}`,
      response.status,
    );
  }

  return response.json();
}

/**
 * Test connection to a remote server
 */
export async function testRemoteConnection(url: string): Promise<boolean> {
  return checkHealth(url);
}

export async function cloneWorkspace(
  gitUrl: string,
  destinationRoot: string,
  workspace?: Workspace | null,
): Promise<Workspace> {
  const destination = `${destinationRoot}/${extractRepoName(gitUrl)}`;

  return apiFetch<Workspace>(
    "/api/workspaces/clone",
    {
      method: "POST",
      body: JSON.stringify({
        url: gitUrl,
        destination,
      }),
    },
    workspace,
  );
}

export async function updateWorkspace(
  workspaceId: string,
  payload: {
    serverUrl?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
  workspace?: Workspace | null,
): Promise<Workspace> {
  return apiFetch<Workspace>(
    `/api/workspaces/${workspaceId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    workspace,
  );
}

type ConfigResponse = {
  id: string;
  data: {
    clone_directory?: string;
    [key: string]: unknown;
  };
  createdAt: string | null;
  updatedAt: string | null;
};

export async function getConfig(): Promise<ConfigResponse> {
  return apiFetch<ConfigResponse>("/api/config");
}

export async function updateConfig(
  data: Record<string, unknown>,
): Promise<ConfigResponse> {
  return apiFetch<ConfigResponse>("/api/config", {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
}

// --- Workspace tool status ---

export type ToolState = {
  installed: boolean;
  globalEnabled: boolean;
  workspaceEnabled: boolean;
};

export type WorkspaceStatus = {
  github: ToolState;
  sentry: ToolState;
};

export async function getWorkspaceStatus(
  workspaceId: string,
  workspace?: Workspace | null,
): Promise<WorkspaceStatus> {
  return apiFetch<WorkspaceStatus>(
    `/api/workspaces/${workspaceId}/status`,
    undefined,
    workspace,
  );
}

export async function enableTool(
  tool: "github" | "sentry",
): Promise<ConfigResponse> {
  return updateConfig({ [tool]: true });
}

// --- GitHub issues ---

export type GithubIssue = {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  updatedAt: string;
  labels: { name: string; color: string }[];
  url: string;
};

export async function getGithubIssues(
  workspaceId: string,
  workspace?: Workspace | null,
): Promise<GithubIssue[]> {
  const result = await apiFetch<{ data: GithubIssue[] }>(
    `/api/workspaces/${workspaceId}/github/issues`,
    undefined,
    workspace,
  );
  return result.data;
}

// --- Sentry issues ---

export type SentryIssue = {
  id: string;
  shortId: string;
  title: string;
  level: string;
  count: string;
  lastSeen: string;
  permalink: string;
  status: string;
  priority: string;
};

export async function getSentryIssues(
  workspaceId: string,
  workspace?: Workspace | null,
): Promise<SentryIssue[]> {
  const result = await apiFetch<{ data: SentryIssue[] }>(
    `/api/workspaces/${workspaceId}/sentry/issues`,
    undefined,
    workspace,
  );
  return result.data;
}

// Re-export checkHealth for convenience
export { checkHealth };
