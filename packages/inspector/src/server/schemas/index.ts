import { existsSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";

// Config schemas
export const updateConfigSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;

// Workspace schemas
export const createWorkspaceSchema = z.object({
  path: z
    .string()
    .min(1, "Path is required")
    .refine((p) => isAbsolute(p), { message: "Path must be absolute" })
    .refine((p) => existsSync(p), { message: "Path does not exist" }),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const cloneWorkspaceSchema = z.object({
  url: z.string().min(1, "Git URL is required"),
  destination: z
    .string()
    .min(1, "Destination is required")
    .refine((p) => isAbsolute(p), { message: "Destination must be absolute" }),
});

export type CloneWorkspaceInput = z.infer<typeof cloneWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  serverUrl: z.string().url("Invalid server URL").nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

// Param schemas
export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export type IdParam = z.infer<typeof idParamSchema>;

// Query schemas for list endpoints
export const listWorkspacesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type ListWorkspacesQuery = z.infer<typeof listWorkspacesQuerySchema>;
