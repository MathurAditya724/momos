import type { actionScriptSchema } from "@momos/service";
import { Globe, type LucideIcon, MousePointer, Play, Sparkles } from "lucide-react";
import type { z } from "zod";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { Skeleton } from "@/client/components/ui/skeleton";

type Script = z.infer<typeof actionScriptSchema>;
type Action = Script["actions"][number];

// Extensible registry - add new action types here
interface ActionConfig {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  getDetails: (action: Action) => { label: string; value: string }[];
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  goto: {
    label: "Navigate",
    icon: Globe,
    colorClass: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    getDetails: (action) => [
      { label: "URL", value: (action as { url: string }).url },
    ],
  },
  click: {
    label: "Click",
    icon: MousePointer,
    colorClass: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    getDetails: (action) => [
      { label: "Selector", value: (action as { selector: string }).selector },
    ],
  },
};

interface ScriptPanelProps {
  script: Script | null;
  isGenerating: boolean;
  isRunning: boolean;
  onRun: () => void;
}

export function ScriptPanel({
  script,
  isGenerating,
  isRunning,
  onRun,
}: ScriptPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">
          Generated Script
        </span>
        {script && (
          <Button size="sm" onClick={onRun} disabled={isRunning}>
            {isRunning ? (
              <>Running...</>
            ) : (
              <>
                <Play className="size-3" />
                Run
              </>
            )}
          </Button>
        )}
      </div>
      <ScrollArea className="min-h-0 flex-1 bg-muted/30">
        <div className="p-4">
          {isGenerating ? (
            <ScriptSkeleton />
          ) : script ? (
            <ActionBlockList script={script} />
          ) : (
            <ScriptPlaceholder />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ActionBlockList({ script }: { script: Script }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-mono">
          v{script.version}
        </Badge>
        <span>{script.actions.length} action(s)</span>
      </div>
      <div className="space-y-2">
        {script.actions.map((action, index) => (
          <ActionBlock key={index} action={action} index={index} />
        ))}
      </div>
    </div>
  );
}

function ActionBlock({ action, index }: { action: Action; index: number }) {
  const config = ACTION_CONFIG[action.type];

  if (!config) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Unknown action type: {action.type}
      </div>
    );
  }

  const Icon = config.icon;
  const details = config.getDetails(action);

  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className={`rounded-md border p-1.5 ${config.colorClass}`}>
              <Icon className="size-3.5" />
            </div>
            <Badge variant="secondary" className="text-xs">
              {config.label}
            </Badge>
          </div>
          <div className="space-y-1">
            {details.map((detail) => (
              <div key={detail.label} className="text-sm">
                <span className="text-muted-foreground">{detail.label}: </span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {detail.value}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScriptSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-3">
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 rounded-md" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptPlaceholder() {
  return (
    <div className="flex h-full min-h-32 items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Sparkles className="mx-auto mb-2 size-8 opacity-50" />
        <p className="text-sm">Enter a URL and prompt to generate a script</p>
      </div>
    </div>
  );
}
