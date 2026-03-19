import { useLocalStorage } from "@uidotdev/usehooks";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { z } from "zod/v3";
import {
  getConfig,
  updateConfig as updateServerConfigApi,
} from "@/client/lib/api";

const GlobalContext = createContext<ReturnType<typeof useGlobalManager> | null>(
  null,
);

export function GlobalProvider({ children }: PropsWithChildren) {
  const value = useGlobalManager();

  return (
    <GlobalContext.Provider value={value}>
      {value.isConfigLoading ? <GlobalSkeleton /> : children}
    </GlobalContext.Provider>
  );
}

export enum Theme {
  LIGHT = "light",
  DARK = "dark",
  SYSTEM = "system",
}

const configSchema = z.object({
  theme: z.nativeEnum(Theme).default(Theme.SYSTEM),
  toastPosition: z
    .enum([
      "top-left",
      "top-center",
      "top-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ])
    .default("bottom-right"),
});

type Config = z.infer<typeof configSchema>;
const defaultConfig = configSchema.parse({});

type ServerConfig = {
  cloneDirectory: string;
  github: boolean;
  sentry: boolean;
};

const defaultServerConfig: ServerConfig = {
  cloneDirectory: "",
  github: false,
  sentry: false,
};

function useGlobalManager() {
  const [config, setConfig] = useLocalStorage<Config>(
    "mglobal-config",
    defaultConfig,
  );
  const [serverConfig, setServerConfig] =
    useState<ServerConfig>(defaultServerConfig);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [resolvedTheme, setResolvedTheme] = useState<Theme.LIGHT | Theme.DARK>(
    Theme.LIGHT,
  );

  const toggleTheme = useCallback(
    (value?: Theme) => {
      const nextTheme =
        value ?? (config.theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
      setConfig({ ...config, theme: nextTheme });
    },
    [config, setConfig],
  );

  // For dynamic theme value
  useEffect(() => {
    let isMounted = true;

    getConfig()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setServerConfig({
          cloneDirectory:
            typeof response.data.clone_directory === "string"
              ? response.data.clone_directory
              : "",
          github: response.data.github === true,
          sentry: response.data.sentry === true,
        });
      })
      .catch(() => {
        if (isMounted) {
          setServerConfig(defaultServerConfig);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsConfigLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const systemTheme = media.matches ? Theme.DARK : Theme.LIGHT;

    const updateResolvedTheme = () => {
      const newResolvedTheme =
        config.theme === Theme.SYSTEM ? systemTheme : config.theme;
      setResolvedTheme(newResolvedTheme);
      const root = window.document.documentElement;
      root.classList.remove(Theme.LIGHT, Theme.DARK);
      root.classList.add(newResolvedTheme);
    };

    updateResolvedTheme();

    if (config.theme === Theme.SYSTEM) {
      media.addEventListener("change", updateResolvedTheme);
      return () => media.removeEventListener("change", updateResolvedTheme);
    }
  }, [config.theme]);

  const updateConfig = useCallback(
    (partial: Partial<Config>) => {
      setConfig((prev) => {
        const newConfig = { ...prev, ...partial };
        const result = configSchema.safeParse(newConfig);
        if (!result.success) {
          console.error(result.error.message);
          return prev;
        }
        return result.data;
      });
    },
    [setConfig],
  );

  const updateServerConfig = useCallback(
    async (partial: Partial<ServerConfig>) => {
      const payload: Record<string, unknown> = {};

      if ("cloneDirectory" in partial) {
        payload.clone_directory = partial.cloneDirectory ?? "";
      }
      if ("github" in partial) {
        payload.github = partial.github ?? false;
      }
      if ("sentry" in partial) {
        payload.sentry = partial.sentry ?? false;
      }

      const result = await updateServerConfigApi(payload);

      setServerConfig({
        cloneDirectory:
          typeof result.data.clone_directory === "string"
            ? result.data.clone_directory
            : "",
        github: result.data.github === true,
        sentry: result.data.sentry === true,
      });
    },
    [],
  );

  return useMemo(
    () => ({
      config,
      resolvedTheme,
      serverConfig,
      isConfigLoading,
      toggleTheme,
      updateConfig,
      updateServerConfig,
    }),
    [
      config,
      isConfigLoading,
      resolvedTheme,
      serverConfig,
      toggleTheme,
      updateConfig,
      updateServerConfig,
    ],
  );
}

function GlobalSkeleton() {
  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

export function useGlobal() {
  const context = useContext(GlobalContext);

  if (!context) {
    throw new Error("Missing Global.Provider in the tree!");
  }

  return context;
}
