import type z from "zod";
import type { actionScriptSchema } from "../schemas";
import { Actions } from "../schemas/v1";

export function parseScript(script: z.infer<typeof actionScriptSchema>) {
  const { version, actions } = script;

  if (version !== "1.0.0") {
    throw new Error("Unsupported script version");
  }

  let jsScript = "";
  for (const action of actions) {
    switch (action.type) {
      case Actions.CLICK:
        jsScript += `await page.click('${action.selector}');`;
        break;
      case Actions.GOTO:
        jsScript += `await page.goto('${action.url}');`;
        break;
    }

    jsScript += "\n";
  }

  return jsScript;
}
