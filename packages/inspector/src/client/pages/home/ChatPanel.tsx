import type { actionScriptSchema } from "@momos/service";
import { Globe, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { z } from "zod";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/client/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/client/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/client/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolOutput,
  type ToolState,
} from "@/client/components/ai-elements/tool";
import ToogleThemeIconButton from "@/client/components/layout/ToogleTheme";
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";

type Script = z.infer<typeof actionScriptSchema>;

export type GenerateValues = {
  url: string;
  prompt: string;
  previousScript?: Script;
};

export type ToolCallInfo = {
  id: string;
  toolName: string;
  status: "calling" | "completed" | "error";
  output?: unknown;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  toolCalls?: ToolCallInfo[];
};

interface ChatPanelProps {
  onGenerate: (values: GenerateValues) => void;
  isLoading: boolean;
  currentScript: Script | null;
}

export interface ChatPanelRef {
  startStreamingMessage: () => void;
  updateStreamingMessage: (text: string) => void;
  finishStreamingMessage: () => void;
  addToolCall: (toolCall: ToolCallInfo) => void;
  updateToolCall: (id: string, update: Partial<ToolCallInfo>) => void;
}

// Map our status to Tool component state
function getToolState(status: ToolCallInfo["status"]): ToolState {
  switch (status) {
    case "calling":
      return "input-streaming";
    case "completed":
      return "output-available";
    case "error":
      return "output-error";
    default:
      return "calling";
  }
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(
  function ChatPanel({ onGenerate, isLoading, currentScript }, ref) {
    const [url, setUrl] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");
    const streamingIdRef = useRef<string | null>(null);

    // Expose streaming methods to parent
    useImperativeHandle(ref, () => ({
      startStreamingMessage: () => {
        const id = nanoid();
        streamingIdRef.current = id;
        const assistantMessage: ChatMessage = {
          id,
          role: "assistant",
          content: "",
          isStreaming: true,
          toolCalls: [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      },
      updateStreamingMessage: (newText: string) => {
        if (!streamingIdRef.current) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingIdRef.current
              ? { ...msg, content: newText }
              : msg,
          ),
        );
      },
      finishStreamingMessage: () => {
        if (!streamingIdRef.current) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingIdRef.current
              ? { ...msg, isStreaming: false }
              : msg,
          ),
        );
        streamingIdRef.current = null;
      },
      addToolCall: (toolCall: ToolCallInfo) => {
        if (!streamingIdRef.current) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingIdRef.current
              ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
              : msg,
          ),
        );
      },
      updateToolCall: (id: string, update: Partial<ToolCallInfo>) => {
        if (!streamingIdRef.current) return;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingIdRef.current
              ? {
                  ...msg,
                  toolCalls: msg.toolCalls?.map((tc) =>
                    tc.id === id ? { ...tc, ...update } : tc,
                  ),
                }
              : msg,
          ),
        );
      },
    }));

    const handleSubmit = (message: PromptInputMessage) => {
      const prompt = message.text.trim();
      if (!prompt) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: nanoid(),
        role: "user",
        content: prompt,
      };
      setMessages((prev) => [...prev, userMessage]);
      setText("");

      // Call generate with current script for iteration
      onGenerate({
        url: url || "https://example.com",
        prompt,
        previousScript: currentScript ?? undefined,
      });
    };

    return (
      <div className="flex h-full flex-col">
        {/* URL Input Header */}
        <div className="shrink-0 border-b px-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <Input
              type="url"
              placeholder="Enter target URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <ToogleThemeIconButton />
          </div>
        </div>

        {/* Chat Messages */}
        <Conversation className="flex-1">
          <ConversationContent className="gap-4 p-4">
            {messages.length === 0 ? (
              <ConversationEmptyState
                icon={<Sparkles className="size-8" />}
                title="Start building your test script"
                description="Describe what you want to test and I'll generate the automation script for you."
              />
            ) : (
              messages.map((msg) => (
                <Message key={msg.id} from={msg.role}>
                  <MessageContent>
                    {msg.role === "assistant" ? (
                      <div className="space-y-3">
                        {/* Agent badge and content */}
                        <div className="flex items-start gap-2">
                          <Badge variant="secondary" className="shrink-0">
                            <Sparkles className="mr-1 size-3" />
                            Agent
                          </Badge>
                          <div className="min-w-0 flex-1">
                            {msg.content ? (
                              <MessageResponse>{msg.content}</MessageResponse>
                            ) : msg.isStreaming ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span>Generating script</span>
                                <span className="flex gap-1">
                                  <span
                                    className="size-1.5 animate-bounce rounded-full bg-current"
                                    style={{ animationDelay: "0ms" }}
                                  />
                                  <span
                                    className="size-1.5 animate-bounce rounded-full bg-current"
                                    style={{ animationDelay: "150ms" }}
                                  />
                                  <span
                                    className="size-1.5 animate-bounce rounded-full bg-current"
                                    style={{ animationDelay: "300ms" }}
                                  />
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Tool calls */}
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <div className="space-y-2">
                            {msg.toolCalls.map((toolCall) => (
                              <Tool
                                key={toolCall.id}
                                state={getToolState(toolCall.status)}
                                defaultOpen={false}
                              >
                                <ToolHeader
                                  type={toolCall.toolName}
                                  state={getToolState(toolCall.status)}
                                />
                                {toolCall.output !== undefined && (
                                  <ToolContent>
                                    <ToolOutput output={toolCall.output} />
                                  </ToolContent>
                                )}
                              </Tool>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <MessageResponse>{msg.content}</MessageResponse>
                    )}
                  </MessageContent>
                </Message>
              ))
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Chat Input */}
        <div className="shrink-0 border-t px-4 py-3">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={
                  currentScript
                    ? "Describe changes to the script..."
                    : "Describe what you want to test..."
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {currentScript && (
                  <Badge variant="outline" className="text-xs">
                    {currentScript.actions.length} action(s)
                  </Badge>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!text.trim() || isLoading}
                status={isLoading ? "streaming" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    );
  },
);
