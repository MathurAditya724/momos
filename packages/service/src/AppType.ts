import type app from "./index";

export { actionScriptSchema } from "./schemas";
export type { TraceData, TraceStep } from "./types/trace";

export type AppType = typeof app;
