import { Play } from "lucide-react";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { Skeleton } from "@/client/components/ui/skeleton";

export interface RunResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface OutputPanelProps {
  response: RunResponse | null;
  isLoading: boolean;
}

export function OutputPanel({ response, isLoading }: OutputPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center border-b px-4 py-2">
        <span className="text-sm font-medium text-muted-foreground">
          Output
        </span>
        {response && (
          <span
            className={`ml-auto text-xs ${response.exitCode === 0 ? "text-green-600" : "text-red-600"}`}
          >
            Exit code: {response.exitCode}
          </span>
        )}
      </div>
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
