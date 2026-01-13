import type { actionScriptSchema } from "@momos/service";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import type { z } from "zod";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";
import { client } from "@/client/config/endpoint";
import { parseSSEStream } from "@/client/lib/parse-sse-stream";
import { ChatPanel, type ChatPanelRef, type GenerateValues } from "./ChatPanel";
import { OutputPanel, type RunResponse } from "./OutputPanel";
import { ScriptPanel } from "./ScriptPanel";

type Script = z.infer<typeof actionScriptSchema>;

export default function HomePage() {
  const chatPanelRef = useRef<ChatPanelRef>(null);
  const [generatedScript, setGeneratedScript] = useState<Script | null>(null);
  const [runResponse, setRunResponse] = useState<RunResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async (values: GenerateValues) => {
    setIsGenerating(true);
    setRunResponse(null);

    // Start streaming message in chat
    chatPanelRef.current?.startStreamingMessage();

    let completed = false;

    try {
      // Parse the SSE stream with callbacks using fetch-event-stream
      await parseSSEStream(
        "http://localhost:8787/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
        {
          onToolCallStart: (id, toolName) => {
            chatPanelRef.current?.addToolCall({
              id,
              toolName,
              status: "calling",
            });
          },
          onToolResult: (id, output) => {
            chatPanelRef.current?.updateToolCall(id, {
              status: "completed",
              output,
            });
          },
          onComplete: (state) => {
            console.log("[SSE] onComplete called", {
              textContent: state.textContent,
              structuredOutput: state.structuredOutput,
              isComplete: state.isComplete,
            });

            completed = true;

            // Extract structured output from parsed JSON
            const output = state.structuredOutput as {
              message?: string;
              script?: Script;
            } | null;

            console.log("[SSE] Parsed output:", output);

            if (output?.script) {
              setGeneratedScript(output.script);
            }

            // Update message BEFORE finishing
            if (output?.message) {
              console.log("[SSE] Setting message:", output.message);
              chatPanelRef.current?.updateStreamingMessage(output.message);
            } else {
              chatPanelRef.current?.updateStreamingMessage(
                output?.script
                  ? "Script generated successfully."
                  : "I couldn't generate a script based on your request.",
              );
            }

            // Finish streaming after updating message
            chatPanelRef.current?.finishStreamingMessage();
            setIsGenerating(false);
          },
          onError: (error) => {
            console.error("[SSE] Stream error:", error);
            chatPanelRef.current?.updateStreamingMessage(`Error: ${error}`);
          },
        },
      );
    } catch (error) {
      console.error("Generation failed:", error);
      chatPanelRef.current?.updateStreamingMessage(
        "Sorry, something went wrong. Please try again.",
      );
    } finally {
      // Only finalize if onComplete wasn't called
      if (!completed) {
        console.log(
          "[SSE] Finalizing in finally block (onComplete not called)",
        );
        chatPanelRef.current?.finishStreamingMessage();
        setIsGenerating(false);
      }
    }
  }, []);

  const runMutation = useMutation({
    mutationFn: async (script: Script) => {
      const response = await client.run.$post({
        json: { script },
      });
      return response.json() as Promise<RunResponse>;
    },
    onSuccess: (data) => {
      setRunResponse(data);
    },
  });

  const handleRun = () => {
    if (generatedScript) {
      runMutation.mutate(generatedScript);
    }
  };

  return (
    <div className="size-full">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Panel - Chat */}
        <ResizablePanel defaultSize={35} minSize={25}>
          <ChatPanel
            ref={chatPanelRef}
            onGenerate={handleGenerate}
            isLoading={isGenerating}
            currentScript={generatedScript}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Script and Output */}
        <ResizablePanel defaultSize={65} minSize={40}>
          <ResizablePanelGroup direction="vertical">
            {/* Script Panel */}
            <ResizablePanel defaultSize={60} minSize={30}>
              <ScriptPanel
                script={generatedScript}
                isGenerating={isGenerating}
                isRunning={runMutation.isPending}
                onRun={handleRun}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Output Panel */}
            <ResizablePanel defaultSize={40} minSize={20}>
              <OutputPanel
                response={runResponse}
                isLoading={runMutation.isPending}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
