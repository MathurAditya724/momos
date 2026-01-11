import { resolve } from "node:path";
import { defineConfig, loadEnv } from "electron-vite";
import sourcemaps from "rollup-plugin-sourcemaps2";
import { aliases, frontendPlugins } from "./vite.config.base";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // By default, only env variables prefixed with `MAIN_VITE_`,
  // `PRELOAD_VITE_` and `RENDERER_VITE_` are loaded,
  // unless the third parameter `prefixes` is changed.
  let env = {};
  if (mode !== "development") {
    env = loadEnv(mode);
  }
  return {
    main: {
      resolve: {
        alias: aliases,
      },
      build: {
        outDir: "dist-electron/main",
        sourcemap: true,
        rollupOptions: {
          plugins: [sourcemaps()],
          input: {
            index: resolve(__dirname, "src/electron/main/index.ts"),
          },
        },
      },
    },
    preload: {
      resolve: {
        alias: aliases,
      },
      build: {
        outDir: "dist-electron/preload",
        sourcemap: true,
        rollupOptions: {
          plugins: [sourcemaps()],
          input: {
            index: resolve(__dirname, "src/electron/preload/index.ts"),
          },
        },
      },
    },
    renderer: {
      resolve: {
        alias: aliases,
      },
      define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.npm_package_version": JSON.stringify(
          process.env.npm_package_version,
        ),
      },
      plugins: frontendPlugins,
      root: ".",
      build: {
        outDir: "dist-electron/renderer",
        sourcemap: true,
        rollupOptions: {
          plugins: [sourcemaps()],
          input: {
            index: resolve(__dirname, "index.html"),
          },
        },
      },
    },
  };
});
