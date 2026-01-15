import type z from "zod";
import type { actionScriptSchema } from "../schemas";
import { Actions } from "../schemas/v1";

/**
 * Escapes a string for safe use in JavaScript template literals
 */
function escapeForJs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Gets the details string for an action (used for trace display)
 */
function getActionDetails(
  action: z.infer<typeof actionScriptSchema>["actions"][number]
): string {
  switch (action.type) {
    case Actions.CLICK:
      return action.selector;
    case Actions.GOTO:
      return action.url;
    case Actions.SLEEP:
      return `${action.milliseconds}ms`;
    default:
      return "";
  }
}

export function parseScript(script: z.infer<typeof actionScriptSchema>) {
  const { version, actions } = script;

  if (version !== "1.0.0") {
    throw new Error("Unsupported script version");
  }

  const lines: string[] = [];

  actions.forEach((action, index) => {
    const details = escapeForJs(getActionDetails(action));

    switch (action.type) {
      case Actions.CLICK:
        lines.push(`await page.click('${escapeForJs(action.selector)}');`);
        break;
      case Actions.GOTO:
        lines.push(`await page.goto('${escapeForJs(action.url)}');`);
        lines.push(`await addSpotlight(page);`); // Inject Sentry/Spotlight after navigation
        break;
      case Actions.SLEEP:
        lines.push(`await page.waitForTimeout(${action.milliseconds});`);
        break;
    }

    // Inject captureStep call after each action
    lines.push(`await captureStep(${index}, '${action.type}', '${details}');`);
    lines.push(""); // Empty line for readability
  });

  return lines.join("\n");
}
