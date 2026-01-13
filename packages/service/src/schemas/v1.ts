import { z } from "zod";

export const Actions = {
  CLICK: "click",
  GOTO: "goto",
} as const;

export const clickActionSchema = z.object({
  type: z.literal(Actions.CLICK),
  selector: z.string(),
});

export const gotoActionSchema = z.object({
  type: z.literal(Actions.GOTO),
  url: z.string(),
});

export const actionScriptSchemaV1 = z.object({
  version: z.literal("1.0.0"),
  actions: z.array(z.union([clickActionSchema, gotoActionSchema])),
});
