import type { AppType } from "@momos/service";
import { hc } from "hono/client";

export const client = hc<AppType>("http://localhost:8787", {
  init: {
    credentials: "include",
  },
});
