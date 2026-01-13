import type { TraceData, TraceStep } from "@momos/service";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  type LucideIcon,
  MousePointer,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { ScrollArea } from "@/client/components/ui/scroll-area";
import { cn } from "@/client/lib/utils";

// Action type configuration (matches ScriptPanel styling)
interface ActionConfig {
  label: string;
  icon: LucideIcon;
  colorClass: string;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  goto: {
    label: "Navigate",
    icon: Globe,
    colorClass:
      "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  },
  click: {
    label: "Click",
    icon: MousePointer,
    colorClass:
      "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  },
  sleep: {
    label: "Sleep",
    icon: Timer,
    colorClass:
      "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    colorClass:
      "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  },
};

function getActionConfig(action: string): ActionConfig {
  return (
    ACTION_CONFIG[action] || {
      label: action,
      icon: Globe,
      colorClass: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    }
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatTimestamp(timestamp: number, startTime: number): string {
  const elapsed = timestamp - startTime;
  return `+${formatDuration(elapsed)}`;
}

interface TraceViewerProps {
  trace: TraceData;
}

export function TraceViewer({ trace }: TraceViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedStep = trace.steps[selectedIndex];

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(trace.steps.length - 1, prev + 1));
      }
    },
    [trace.steps.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (trace.steps.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 size-8 opacity-50" />
          <p className="text-sm">No trace steps captured</p>
          {trace.error && (
            <p className="mt-2 text-xs text-red-500">{trace.error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header with summary */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          {trace.success ? (
            <CheckCircle2 className="size-4 text-green-500" />
          ) : (
            <AlertCircle className="size-4 text-red-500" />
          )}
          <span className="text-sm font-medium">
            {trace.steps.length} step{trace.steps.length !== 1 ? "s" : ""}
          </span>
          <Badge variant="outline" className="text-xs">
            <Clock className="mr-1 size-3" />
            {formatDuration(trace.duration)}
          </Badge>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setSelectedIndex((prev) => Math.max(0, prev - 1))}
            disabled={selectedIndex === 0}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[4rem] text-center text-xs text-muted-foreground">
            {selectedIndex + 1} / {trace.steps.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() =>
              setSelectedIndex((prev) =>
                Math.min(trace.steps.length - 1, prev + 1)
              )
            }
            disabled={selectedIndex === trace.steps.length - 1}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Timeline sidebar */}
        <ScrollArea className="w-48 shrink-0 border-r">
          <div className="p-2">
            {trace.steps.map((step, index) => (
              <TimelineStep
                key={index}
                step={step}
                index={index}
                isSelected={index === selectedIndex}
                startTime={trace.startTime}
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Screenshot area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selectedStep && (
            <>
              {/* Step details */}
              <div className="shrink-0 border-b bg-muted/30 px-4 py-2">
                <StepDetails step={selectedStep} startTime={trace.startTime} />
              </div>

              {/* Screenshot */}
              <div className="relative min-h-0 flex-1 bg-black/5 dark:bg-white/5">
                <img
                  src={`data:image/jpeg;base64,${selectedStep.screenshot}`}
                  alt={`Step ${selectedStep.index + 1}: ${selectedStep.action}`}
                  className="absolute inset-0 size-full object-contain"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scrubber */}
      <div className="shrink-0 border-t px-4 py-2">
        <input
          type="range"
          min={0}
          max={trace.steps.length - 1}
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="w-full accent-primary"
        />
      </div>
    </div>
  );
}

interface TimelineStepProps {
  step: TraceStep;
  index: number;
  isSelected: boolean;
  startTime: number;
  onClick: () => void;
}

function TimelineStep({
  step,
  index,
  isSelected,
  startTime,
  onClick,
}: TimelineStepProps) {
  const config = getActionConfig(step.action);
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        isSelected
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
    >
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          isSelected ? "bg-primary-foreground/20" : "bg-muted"
        )}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Icon className="size-3" />
          <span className="truncate text-xs font-medium">{config.label}</span>
        </div>
        <div
          className={cn(
            "truncate text-xs",
            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatTimestamp(step.timestamp, startTime)}
        </div>
      </div>
    </button>
  );
}

interface StepDetailsProps {
  step: TraceStep;
  startTime: number;
}

function StepDetails({ step, startTime }: StepDetailsProps) {
  const config = getActionConfig(step.action);
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3">
      <div className={cn("rounded-md border p-1.5", config.colorClass)}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{config.label}</span>
          <Badge variant="secondary" className="text-xs">
            {formatTimestamp(step.timestamp, startTime)}
          </Badge>
        </div>
        <div className="mt-1 text-sm">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {step.details}
          </code>
        </div>
        {step.url && (
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {step.url}
          </div>
        )}
      </div>
    </div>
  );
}
