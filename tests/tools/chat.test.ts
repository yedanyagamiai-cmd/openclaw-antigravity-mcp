import { describe, it, expect, vi } from "vitest";
import { handleChat } from "../../src/tools/chat.js";
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
  content: [{ type: "text", text: "Hello back!" }],
  model: "claude-sonnet-4-6",
  stop_reason: "end_turn",
  usage: { input_tokens: 10, output_tokens: 5 },
};

describe("handleChat", () => {
  it("sends message and returns text", async () => {
    const client = mockClient(baseResponse);
    const result = await handleChat(client, {
      message: "Hello",
      model: "claude-sonnet-4-6",
    });

    expect(result).toBe("Hello back!");
    expect(client.chat).toHaveBeenCalledWith({
      model: "claude-sonnet-4-6",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 8192,
      system: undefined,
      temperature: undefined,
    });
  });

  it("prepends history to messages", async () => {
    const client = mockClient(baseResponse);
    await handleChat(client, {
      message: "follow up",
      model: "test",
      history: [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
      ],
    });

    const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.messages).toHaveLength(3);
    expect(call.messages[0]).toEqual({ role: "user", content: "first" });
    expect(call.messages[2]).toEqual({ role: "user", content: "follow up" });
  });

  it("passes system and temperature", async () => {
    const client = mockClient(baseResponse);
    await handleChat(client, {
      message: "test",
      model: "test",
      system: "Be brief",
      temperature: 0.5,
    });

    const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.system).toBe("Be brief");
    expect(call.temperature).toBe(0.5);
  });

  it("joins multiple text blocks", async () => {
    const client = mockClient({
      ...baseResponse,
      content: [
        { type: "text", text: "Part 1" },
        { type: "text", text: "Part 2" },
      ],
    });

    const result = await handleChat(client, { message: "test", model: "test" });
    expect(result).toBe("Part 1\nPart 2");
  });

  it("returns fallback for empty response", async () => {
    const client = mockClient({ ...baseResponse, content: [] });
    const result = await handleChat(client, { message: "test", model: "test" });
    expect(result).toBe("(empty response)");
  });

  it("filters out non-text blocks", async () => {
    const client = mockClient({
      ...baseResponse,
      content: [
        { type: "thinking", thinking: "hmm" } as any,
        { type: "text", text: "answer" },
      ],
    });

    const result = await handleChat(client, { message: "test", model: "test" });
    expect(result).toBe("answer");
  });
});
