import type { actionScriptSchema } from "@momos/service";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { z } from "zod";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/client/components/ui/resizable";
import { client } from "@/client/config/endpoint";
import { ChatPanel, type ChatPanelRef, type GenerateValues } from "./ChatPanel";
import { OutputPanel, type RunResponse } from "./OutputPanel";
import { ScriptPanel } from "./ScriptPanel";

type Script = z.infer<typeof actionScriptSchema>;

export default function HomePage() {
  const chatPanelRef = useRef<ChatPanelRef>(null);
  const [generatedScript, setGeneratedScript] = useState<Script | null>(null);
  const [runResponse, setRunResponse] = useState<RunResponse | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (values: GenerateValues) => {
      const response = await client.generate.$post({
        json: values,
      });
      return response.json() as unknown as Promise<{
        message: string;
        script: Script;
      }>;
    },
    onSuccess: (data) => {
      setGeneratedScript(data.script);
      setRunResponse(null);
      // Add assistant message to chat
      chatPanelRef.current?.addAssistantMessage(data.message);
    },
  });

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

  const handleGenerate = (values: GenerateValues) => {
    generateMutation.mutate(values);
  };

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
            isLoading={generateMutation.isPending}
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
                isGenerating={generateMutation.isPending}
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
