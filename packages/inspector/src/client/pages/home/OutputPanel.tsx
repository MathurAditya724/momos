import type { TraceData } from "@momos/service";
import { ImageIcon, Play, Terminal } from "lucide-react";
import { useState } from "react";
import { TraceViewer } from "@/client/components/TraceViewer";
import { Button } from "@/client/components/ui/button";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { Skeleton } from "@/client/components/ui/skeleton";
import { cn } from "@/client/lib/utils";

export interface RunResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  trace?: TraceData | null;
}

interface OutputPanelProps {
  response: RunResponse | null;
  isLoading: boolean;
}

type Tab = "console" | "trace";

export function OutputPanel({ response, isLoading }: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("trace");
  const hasTrace = response?.trace && response.trace.steps.length > 0;

  // Switch to trace tab when trace becomes available
  // Keep console tab if there's no trace

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 px-2",
              activeTab === "trace" && "bg-muted"
            )}
            onClick={() => setActiveTab("trace")}
          >
            <ImageIcon className="size-3.5" />
            Trace
            {hasTrace && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                {response.trace!.steps.length}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 px-2",
              activeTab === "console" && "bg-muted"
            )}
            onClick={() => setActiveTab("console")}
          >
            <Terminal className="size-3.5" />
            Console
          </Button>
        </div>

        {/* Exit code */}
        {response && (
          <span
            className={cn(
              "text-xs",
              response.exitCode === 0 ? "text-green-600" : "text-red-600"
            )}
          >
            Exit code: {response.exitCode}
          </span>
        )}
      </div>

      {/* Content */}
      {activeTab === "trace" ? (
        <div className="min-h-0 flex-1">
          {isLoading ? (
            <TraceSkeleton />
          ) : hasTrace ? (
            <TraceViewer trace={response.trace!} />
          ) : (
            <TracePlaceholder hasResponse={!!response} />
          )}
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {isLoading ? (
              <OutputSkeleton />
            ) : response ? (
              <ResponseOutput response={response} />
            ) : (
              <OutputPlaceholder />
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function OutputSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

function OutputPlaceholder() {
  return (
    <div className="flex h-full min-h-20 items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Play className="mx-auto mb-2 size-6 opacity-50" />
        <p className="text-sm">Run the script to see output here</p>
      </div>
    </div>
  );
}

function ResponseOutput({ response }: { response: RunResponse }) {
  return (
    <div className="space-y-4 font-mono text-sm">
      {response.stdout && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            stdout
          </div>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3">
            {response.stdout}
          </pre>
        </div>
      )}
      {response.stderr && (
        <div>
          <div className="mb-1 text-xs font-medium text-red-600">stderr</div>
          <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-red-800 dark:bg-red-950/30 dark:text-red-400">
            {response.stderr}
          </pre>
        </div>
      )}
      {!response.stdout && !response.stderr && (
        <p className="text-muted-foreground">No output</p>
      )}
    </div>
  );
}

function TraceSkeleton() {
  return (
    <div className="flex h-full">
      {/* Timeline skeleton */}
      <div className="w-48 shrink-0 space-y-2 border-r p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        ))}
      </div>
      {/* Screenshot skeleton */}
      <div className="flex-1 p-4">
        <Skeleton className="mb-2 h-8 w-full" />
        <Skeleton className="aspect-video w-full" />
      </div>
    </div>
  );
}

function TracePlaceholder({ hasResponse }: { hasResponse: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="text-center">
        <ImageIcon className="mx-auto mb-2 size-8 opacity-50" />
        <p className="text-sm">
          {hasResponse
            ? "No trace data available"
            : "Run the script to capture screenshots"}
        </p>
        <p className="mt-1 text-xs opacity-70">
          Screenshots are captured after each action
        </p>
      </div>
    </div>
  );
}
