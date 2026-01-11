import { useLocalStorage } from "@uidotdev/usehooks";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { z } from "zod/v3";

const GlobalContext = createContext<ReturnType<typeof useGlobalManager> | null>(
  null,
);

export function GlobalProvider({ children }: PropsWithChildren) {
  const value = useGlobalManager();
  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
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

function useGlobalManager() {
  const [config, setConfig] = useLocalStorage<Config>(
    "mglobal-config",
    defaultConfig,
  );
  const [resolvedTheme, setResolvedTheme] = useState<Theme.LIGHT | Theme.DARK>(
    Theme.LIGHT,
  );

  function toggleTheme(value?: Theme) {
    const _value =
      (value ?? config.theme === Theme.LIGHT) ? Theme.DARK : Theme.LIGHT;
    setConfig({ ...config, theme: _value });
  }

  // For dynamic theme value
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

  return {
    config,
    resolvedTheme,
    toggleTheme,
    updateConfig,
  };
}

export function useGlobal() {
  const context = useContext(GlobalContext);

  if (!context) {
    throw new Error("Missing Global.Provider in the tree!");
  }

  return context;
}
