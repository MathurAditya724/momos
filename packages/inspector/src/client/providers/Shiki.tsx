import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";
import {
  createdBundledHighlighter,
  createSingletonShorthands,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const BundledLanguages = {
  json: () => import("@shikijs/langs/json"),
  javascript: () => import("@shikijs/langs/javascript"),
};

const BundledThemes = {
  "github-light-default": () => import("@shikijs/themes/github-light-default"),
  "github-dark-default": () => import("@shikijs/themes/github-dark-default"),
};

const ShikiContext = createContext<ReturnType<typeof useShikiManager> | null>(
  null,
);

export function ShikiProvider({ children }: PropsWithChildren) {
  const value = useShikiManager();
  return (
    <ShikiContext.Provider value={value}>{children}</ShikiContext.Provider>
  );
}

function useShikiManager() {
  const highlighter = useMemo(() => {
    const createHighlighter = /* @__PURE__ */ createdBundledHighlighter({
      langs: BundledLanguages,
      themes: BundledThemes,
      engine: () => createJavaScriptRegexEngine(),
    });

    return createSingletonShorthands(createHighlighter);
  }, []);

  return highlighter;
}

export function useShiki() {
  const context = useContext(ShikiContext);

  return context;
}
