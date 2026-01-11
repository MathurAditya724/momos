import { Moon, Sun } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Theme, useGlobal } from "@/client/providers/Global";

export default function ToogleThemeIconButton() {
  const { resolvedTheme, toggleTheme } = useGlobal();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => toggleTheme()}
      className="size-9"
    >
      {resolvedTheme === Theme.LIGHT ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
