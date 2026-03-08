import { describe, it, expect, vi } from "vitest";
import { handleReason } from "../../src/tools/reason.js";
import type { ProxyClient } from "../../src/proxy/client.js";
import type { MessagesResponse } from "../../src/proxy/types.js";

vi.mock("../../src/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function mockClient(response: MessagesResponse): ProxyClient {
  return {
    chat: vi.fn().mockResolvedValue(response),
    listModels: vi.fn(),
    health: vi.fn(),
  } as unknown as ProxyClient;
}

const baseResponse: MessagesResponse = {
  id: "msg_1",
  type: "message",
  role: "assistant",
  content: [{ type: "text", text: "The answer is 42." }],
  model: "claude-opus-4-6-thinking",
  stop_reason: "end_turn",
  usage: { input_tokens: 20, output_tokens: 15 },
};

describe("handleReason", () => {
  it("sends question and returns text", async () => {
    const client = mockClient(baseResponse);
    const result = await handleReason(client, {
      question: "Why is the sky blue?",
      model: "claude-opus-4-6-thinking",
    });

    expect(result).toBe("The answer is 42.");
    const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.messages[0].content).toBe("Why is the sky blue?");
    expect(call.max_tokens).toBe(16384);
    expect(call.system).toContain("deep reasoning");
  });

  it("prepends context when provided", async () => {
    const client = mockClient(baseResponse);
    await handleReason(client, {
      question: "What is X?",
      model: "test",
      context: "X = 42",
    });

    const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.messages[0].content).toContain("Context:\nX = 42");
    expect(call.messages[0].content).toContain("Question:\nWhat is X?");
  });

  it("extracts thinking blocks", async () => {
    const client = mockClient({
      ...baseResponse,
      content: [
        { type: "thinking", thinking: "Let me think..." },
        { type: "text", text: "The answer is 42." },
      ],
    });

    const result = await handleReason(client, {
      question: "test",
      model: "test",
    });

    expect(result).toContain("<thinking>");
    expect(result).toContain("Let me think...");
    expect(result).toContain("</thinking>");
    expect(result).toContain("The answer is 42.");
  });

  it("handles multiple thinking + text blocks", async () => {
    const client = mockClient({
      ...baseResponse,
      content: [
        { type: "thinking", thinking: "Step 1" },
        { type: "thinking", thinking: "Step 2" },
        { type: "text", text: "Final answer" },
      ],
    });

    const result = await handleReason(client, {
      question: "test",
      model: "test",
    });

    expect(result).toContain("Step 1");
    expect(result).toContain("Step 2");
    expect(result).toContain("Final answer");
  });

  it("returns fallback for empty response", async () => {
    const client = mockClient({ ...baseResponse, content: [] });
    const result = await handleReason(client, {
      question: "test",
      model: "test",
    });
    expect(result).toBe("(empty response)");
  });
});
