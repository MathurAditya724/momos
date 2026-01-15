"use client";

import type {
  SpotlightData,
  SpotlightEvent,
} from "@momos/service/types/spotlight";
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Clock,
  Info,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { cn } from "@/client/lib/utils";
import { CodeBlock } from "./ai-elements/code-block";

interface SpotlightViewerProps {
  data: SpotlightData;
}

export function SpotlightViewer({ data }: SpotlightViewerProps) {
  const [selectedEvent, setSelectedEvent] = useState<SpotlightEvent | null>(
    null,
  );
  const [filter, setFilter] = useState<string>("all");

  const filteredData = data.filter((event) => {
    if (filter === "all") return true;
    return event.type.includes(filter);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Bug className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Spotlight Events</span>
          <Badge variant="secondary" className="text-xs">
            {data.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "error" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("error")}
          >
            Errors
          </Button>
          <Button
            variant={filter === "transaction" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("transaction")}
          >
            Transactions
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full w-1/3 shrink-0 border-r">
          <div className="divide-y">
            {filteredData.map((event, index) => (
              <button
                key={event.envelopeId || index}
                onClick={() => setSelectedEvent(event)}
                className={cn(
                  "flex w-full flex-col gap-1 p-3 text-left text-sm transition-colors hover:bg-muted/50",
                  selectedEvent === event && "bg-muted",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      event.type.includes("error") ? "destructive" : "outline"
                    }
                    className="shrink-0 text-[10px] uppercase"
                  >
                    {event.type}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="truncate text-xs font-mono text-muted-foreground">
                  {event.envelopeId}
                </div>
              </button>
            ))}
            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Search className="mb-2 size-8 opacity-20" />
                <p className="text-xs">No events found</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/10">
          {selectedEvent ? (
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">Event Details</h3>
                    <p className="text-xs text-muted-foreground">
                      ID: {selectedEvent.envelopeId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="rounded-md border bg-card">
                  <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                    Headers
                  </div>
                  <div className="p-3">
                    {selectedEvent.headers ? (
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                        {Object.entries(selectedEvent.headers).map(([k, v]) => (
                          <div key={k} className="contents">
                            <span className="font-mono text-muted-foreground">
                              {k}:
                            </span>
                            <span className="font-mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No headers available
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-md border bg-card">
                  <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                    Envelope Data
                  </div>
                  <div className="overflow-hidden p-0">
                    <CodeBlock
                      code={JSON.stringify(selectedEvent.data, null, 2)}
                      language="json"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <Info className="mb-2 size-8 opacity-20" />
              <p className="text-sm">Select an event to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
