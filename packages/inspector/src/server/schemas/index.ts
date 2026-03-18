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

// Param schemas
export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export type IdParam = z.infer<typeof idParamSchema>;
