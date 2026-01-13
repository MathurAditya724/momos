import type { actionScriptSchema } from "@momos/service";
import { Globe, Sparkles } from "lucide-react";
import { nanoid } from "nanoid";
import { forwardRef, useImperativeHandle, useState } from "react";
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
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";

type Script = z.infer<typeof actionScriptSchema>;

export type GenerateValues = {
  url: string;
  prompt: string;
  previousScript?: Script;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface ChatPanelProps {
  onGenerate: (values: GenerateValues) => void;
  isLoading: boolean;
  currentScript: Script | null;
}

export interface ChatPanelRef {
  addAssistantMessage: (message: string) => void;
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(
  function ChatPanel({ onGenerate, isLoading, currentScript }, ref) {
    const [url, setUrl] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState("");

    // Expose method to add assistant message from parent
    useImperativeHandle(ref, () => ({
      addAssistantMessage: (message: string) => {
        const assistantMessage: ChatMessage = {
          id: nanoid(),
          role: "assistant",
          content: message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
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
        <div className="shrink-0 border-b p-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <Input
              type="url"
              placeholder="Enter target URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="h-8 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
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
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          <Sparkles className="mr-1 size-3" />
                          Agent
                        </Badge>
                        <MessageResponse>{msg.content}</MessageResponse>
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
                status={isLoading ? "submitted" : "ready"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    );
  },
);
