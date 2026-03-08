import { describe, it, expect, vi } from "vitest";
import { handleCode } from "../../src/tools/code.js";
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
  content: [{ type: "text", text: "```ts\nconst x = 1;\n```" }],
  model: "claude-sonnet-4-6",
  stop_reason: "end_turn",
  usage: { input_tokens: 10, output_tokens: 20 },
};

describe("handleCode", () => {
  it("sends task and returns code", async () => {
    const client = mockClient(baseResponse);
    const result = await handleCode(client, {
      task: "Write hello world",
      model: "claude-sonnet-4-6",
      action: "generate",
    });

    expect(result).toContain("const x = 1;");
    const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.messages[0].content).toContain("Task: Write hello world");
    expect(call.system).toContain("expert programmer");
  });

  it("includes language in prompt", async () => {
    const client = mockClient(baseResponse);
    await handleCode(client, {
      task: "sort array",
      model: "test",
      action: "generate",
      language: "python",
    });

    const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.messages[0].content).toContain("Language: python");
  });

  it("includes code block in prompt", async () => {
    const client = mockClient(baseResponse);
    await handleCode(client, {
      task: "review this",
      model: "test",
      action: "review",
      code: "function foo() { return 1; }",
    });

    const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.messages[0].content).toContain("```\nfunction foo()");
    expect(call.system).toContain("code reviewer");
  });

  it("uses correct system prompt for each action", async () => {
    const actions = {
      generate: "expert programmer",
      review: "code reviewer",
      debug: "debugging expert",
      refactor: "refactoring specialist",
      explain: "code educator",
    } as const;

    for (const [action, expectedPrompt] of Object.entries(actions)) {
      const client = mockClient(baseResponse);
      await handleCode(client, {
        task: "test",
        model: "test",
        action: action as keyof typeof actions,
      });

      const call = (client.chat as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(call.system).toContain(expectedPrompt);
    }
  });

  it("returns fallback for empty response", async () => {
    const client = mockClient({ ...baseResponse, content: [] });
    const result = await handleCode(client, {
      task: "test",
      model: "test",
      action: "generate",
    });
    expect(result).toBe("(empty response)");
  });

  it("joins multiple text blocks", async () => {
    const client = mockClient({
      ...baseResponse,
      content: [
        { type: "text", text: "Here's the code:" },
        { type: "text", text: "```\nconsole.log('hi')\n```" },
      ],
    });

    const result = await handleCode(client, {
      task: "test",
      model: "test",
      action: "generate",
    });
    expect(result).toBe("Here's the code:\n```\nconsole.log('hi')\n```");
  });
});
