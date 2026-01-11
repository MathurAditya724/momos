import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export const aliases = {
  "@": resolve(__dirname, "./src"),
  "@/client": resolve(__dirname, "./src/client"),
  "@/components": resolve(__dirname, "./src/client/components"),
};

export const frontendPlugins = [react(), tailwindcss()];
