import { cpSync, existsSync, readdirSync } from "node:fs";
import { builtinModules } from "node:module";
import { extname, resolve } from "node:path";
import devServer from "@hono/vite-dev-server";
import tailwindcss from "@tailwindcss/vite";
import {
  defineConfig,
  type Plugin,
  type ResolvedConfig,
  type UserConfig,
} from "vite";
import { aliases, frontendPlugins } from "./vite.config.base";

export default defineConfig(({ mode }) => {
  if (mode === "client")
    return {
      plugins: frontendPlugins,
      resolve: {
        alias: aliases,
      },
    };

  return {
    plugins: [
      tailwindcss(),
      devServer({
        entry: "/src/index.ts",
      }),
      buildServer({
        entry: "/src/index.ts",
      }),
      copyDrizzleMigrations(),
    ],
    resolve: {
      alias: aliases,
    },
  };
});

// Plugin to copy drizzle migrations folder to dist
const copyDrizzleMigrations = (): Plugin => {
  return {
    name: "copy-drizzle-migrations",
    apply: "build",
    closeBundle() {
      const src = resolve(__dirname, "drizzle");
      const dest = resolve(__dirname, "dist/drizzle");

      if (existsSync(src)) {
        cpSync(src, dest, { recursive: true });
        console.log("Copied drizzle migrations to dist/drizzle");
      } else {
        console.warn(
          "Warning: drizzle folder not found. Run 'bun run db:generate' to create migrations.",
        );
      }
    },
  };
};

const buildServer = (options: { entry: string }): Plugin => {
  const virtualEntryId = "virtual:build-entry-module";
  const resolvedVirtualEntryId = `\0${virtualEntryId}`;
  let config: ResolvedConfig;
  const output = "index.js";

  return {
    name: "@hono/vite-build",
    configResolved: async (resolvedConfig) => {
      config = resolvedConfig;
    },
    resolveId(id) {
      if (id === virtualEntryId) {
        return resolvedVirtualEntryId;
      }
    },
    async load(id) {
      if (id === resolvedVirtualEntryId) {
        const staticPaths: string[] = [];
        const direntPaths = [];
        try {
          const publicDirPaths = readdirSync(
            resolve(config.root, config.publicDir),
            {
              withFileTypes: true,
            },
          );
          direntPaths.push(...publicDirPaths);
          const buildOutDirPaths = readdirSync(
            resolve(config.root, config.build.outDir),
            {
              withFileTypes: true,
              recursive: true,
            },
          );
          direntPaths.push(...buildOutDirPaths);
        } catch {}

        const uniqueStaticPaths = new Set<string>();

        for (const p of direntPaths) {
          if (!p.isDirectory()) {
            if (p.name === output) {
              return;
            }

            const basepath = (p.parentPath ?? p.path).split("dist")[1];

            uniqueStaticPaths.add(
              basepath?.endsWith("assets") ? `/assets/${p.name}` : `/${p.name}`,
            );
          }
        }

        staticPaths.push(...Array.from(uniqueStaticPaths));

        return `import "dotenv/config";
        import { Hono } from "hono";
        import { join } from "node:path";
        import { RESPONSE_ALREADY_SENT } from '@hono/node-server/utils/response'  
import { createReadStream } from 'node:fs'

        export default (config) => {
          const mainApp = new Hono()

        ${serveStaticHook("mainApp", {
          filePaths: staticPaths,
        })}

          const modules = import.meta.glob(['${
            options.entry
          }'], { import: 'default', eager: true })
      let added = false
      for (const [, app] of Object.entries(modules)) {
        if (app) {
          const _app = new Hono().use(async (c, next) => {
            c.set("config", config);
            await next();
          }).route("/", app);

          mainApp.all((c) => {
            let executionCtx
            try {
              executionCtx = c.executionCtx
            } catch {}
            return _app.fetch(c.req.raw, c.env, executionCtx)
          })
          mainApp.notFound((c) => {
            // SPA fallback: serve index.html for non-API GET requests
            const url = new URL(c.req.url)
            if (c.req.method === 'GET' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/health') && !url.pathname.startsWith('/version')) {
              const { outgoing } = c.env
              const fileStream = createReadStream(join(import.meta.dirname, '/index.html'))
              outgoing.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
              fileStream.pipe(outgoing)
              return RESPONSE_ALREADY_SENT
            }
            let executionCtx
            try {
              executionCtx = c.executionCtx
            } catch {}
            return _app.fetch(c.req.raw, c.env, executionCtx)
          })
          added = true
        }
      }
      if (!added) {
        throw new Error("Can't import modules from '${options.entry}'")
      }

      return mainApp;
        }`;
      }
    },
    apply: (_config, { command, mode }) => {
      if (command === "build" && mode !== "client") {
        return true;
      }
      return false;
    },
    config: async (): Promise<UserConfig> => {
      return {
        ssr: {
          external: ["@libsql/client", "drizzle-orm"],
          noExternal: true,
          target: "node",
        },
        build: {
          outDir: "./dist",
          emptyOutDir: false,
          minify: true,
          ssr: true,
          copyPublicDir: false,
          rollupOptions: {
            external: [
              ...builtinModules,
              /^node:/,
              "@libsql/client",
              "drizzle-orm",
              /^@libsql\//,
            ],
            input: virtualEntryId,
            output: {
              entryFileNames: output,
            },
          },
        },
      };
    },
  };
};

type ServeStaticHookOptions = {
  filePaths?: string[];
  root?: string;
};

export const serveStaticHook = (
  appName: string,
  options: ServeStaticHookOptions,
) => {
  let code = "";

  const filePaths = options.filePaths ?? [];

  for (const path of filePaths) {
    // NOTE: These are the SPA routes that should serve index.html.
    // When adding new routes to the React app, update this list to ensure
    // the production build serves index.html for those routes.
    const _paths = path === "/index.html" ? ["/"] : [path];

    for (const _path of _paths) {
      code += `${appName}.get('${_path}', (c) => {
        const { outgoing } = c.env  
      
        const fileStream = createReadStream(join(import.meta.dirname, '${path}'))  
          
        outgoing.writeHead(200, {  
          'Content-Type': '${getContentType(path)}',
        })  
          
        fileStream.pipe(outgoing)  
          
        return RESPONSE_ALREADY_SENT  
      })\n`;
    }
  }
  return code;
};

function getContentType(path: string): string {
  const ext = extname(path).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    // Add more as needed
  };

  return mimeTypes[ext] || "application/octet-stream";
}
