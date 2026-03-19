import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Config table - single row for global user settings
// Stores things like GitHub PAT, Sentry auth token, etc.
// NOTE: Credentials are stored in plain text in the local SQLite database.
// This is acceptable for a local development tool, but users should be aware
// that anyone with access to ~/.momos/data.db can read these tokens.
export const config = sqliteTable("config", {
  id: text("id").primaryKey(), // Fixed value like "default"
  data: text("data", { mode: "json" }).$type<{
    github?: boolean;
    sentry?: boolean;
    clone_directory?: string;
    [key: string]: unknown;
  }>(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
});

// Workspace table - one row per unique repo/directory path
export const workspace = sqliteTable("workspace", {
  id: text("id").primaryKey(), // nanoid
  path: text("path").unique().notNull(), // Absolute path to repo root
  serverUrl: text("server_url"), // Optional workspace-specific server URL
  metadata: text("metadata", { mode: "json" }).$type<{
    github?: boolean;
    sentry?: boolean;
    [key: string]: unknown;
  }>(), // Per-workspace tool overrides (mirrors config.data shape)
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
});

// Session table - each workspace can have multiple sessions
export const session = sqliteTable("session", {
  id: text("id").primaryKey(), // nanoid
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
});

// Relations
export const workspaceRelations = relations(workspace, ({ many }) => ({
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  workspace: one(workspace, {
    fields: [session.workspaceId],
    references: [workspace.id],
  }),
}));

// Type exports
export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;
export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
