/**
 * SSE Stream Parser for AI SDK UI Message Stream
 *
 * Parses Server-Sent Events from toUIMessageStreamResponse()
 * Uses fetch-event-stream for proper SSE handling
 */

import { stream } from "fetch-event-stream";

export interface StreamState {
  textContent: string;
  toolCalls: Map<
    string,
    {
      id: string;
      toolName: string;
      args: string;
      status: "calling" | "completed" | "error";
      output?: unknown;
    }
  >;
  structuredOutput: unknown | null;
  isComplete: boolean;
}

export interface StreamCallbacks {
  onTextDelta?: (delta: string, fullText: string) => void;
  onToolCallStart?: (id: string, toolName: string) => void;
  onToolCallDelta?: (id: string, argsText: string) => void;
  onToolResult?: (id: string, output: unknown) => void;
  onComplete?: (state: StreamState) => void;
  onError?: (error: string) => void;
}

/**
 * Parse SSE stream using fetch-event-stream
 */
export async function parseSSEStream(
  url: string,
  options: RequestInit,
  callbacks: StreamCallbacks
): Promise<StreamState> {
  const state: StreamState = {
    textContent: "",
    toolCalls: new Map(),
    structuredOutput: null,
    isComplete: false,
  };

  // Guard to prevent duplicate onComplete calls
  let completeCalled = false;

  const callComplete = () => {
    if (completeCalled) return;
    completeCalled = true;

    state.isComplete = true;
    // Try to parse accumulated text content as JSON
    if (state.textContent && !state.structuredOutput) {
      console.log(
        "[parseSSEStream] Attempting to parse textContent:",
        state.textContent.substring(0, 200)
      );
      try {
        state.structuredOutput = JSON.parse(state.textContent);
        console.log("[parseSSEStream] Successfully parsed JSON");
      } catch (e) {
        console.log("[parseSSEStream] Failed to parse JSON:", e);
        // Text content is not valid JSON
      }
    }
    console.log(
      "[parseSSEStream] callComplete - structuredOutput:",
      state.structuredOutput
    );
    callbacks.onComplete?.(state);
  };

  const events = await stream(url, options);

  for await (const event of events) {
    // Skip empty events or non-data events
    if (!event.data) continue;

    // Handle [DONE] marker
    if (event.data === "[DONE]") {
      callComplete();
      continue;
    }

    // Parse JSON data
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.data);
    } catch {
      continue;
    }

    const eventType = data.type as string;

    switch (eventType) {
      // Tool input streaming (actual event names from toUIMessageStreamResponse)
      case "tool-input-start": {
        const toolCallId = data.toolCallId as string;
        const toolName = data.toolName as string;
        if (toolCallId && toolName) {
          state.toolCalls.set(toolCallId, {
            id: toolCallId,
            toolName,
            args: "",
            status: "calling",
          });
          callbacks.onToolCallStart?.(toolCallId, toolName);
        }
        break;
      }

      case "tool-input-delta": {
        const toolCallId = data.toolCallId as string;
        const inputTextDelta = data.inputTextDelta as string;
        if (toolCallId && inputTextDelta) {
          const toolCall = state.toolCalls.get(toolCallId);
          if (toolCall) {
            toolCall.args += inputTextDelta;
          }
          callbacks.onToolCallDelta?.(toolCallId, inputTextDelta);
        }
        break;
      }

      case "tool-output-available": {
        const toolCallId = data.toolCallId as string;
        const output = data.output;
        if (toolCallId) {
          const toolCall = state.toolCalls.get(toolCallId);
          if (toolCall) {
            toolCall.status = "completed";
            toolCall.output = output;
          }
          callbacks.onToolResult?.(toolCallId, output);
        }
        break;
      }

      // Text streaming
      case "text-delta": {
        const delta = data.delta as string;
        if (delta) {
          state.textContent += delta;
          callbacks.onTextDelta?.(delta, state.textContent);
        }
        break;
      }

      // Completion
      case "finish": {
        callComplete();
        break;
      }

      // Error events - ignore spurious ones like "text part 2 not found"
      case "error": {
        const errorText = data.errorText as string;
        // Only report significant errors, ignore internal SDK errors
        if (
          errorText &&
          !errorText.includes("text part") &&
          !errorText.includes("not found")
        ) {
          callbacks.onError?.(errorText);
        }
        break;
      }

      // Lifecycle events we can ignore
      case "start":
      case "start-step":
      case "finish-step":
      case "text-start":
      case "text-end":
      case "tool-input-available":
        // These are lifecycle events, no action needed
        break;

      default:
        // Unknown event type, ignore
        break;
    }
  }

  return state;
}
