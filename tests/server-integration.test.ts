/**
 * Integration tests for server tool callbacks.
 * Uses InMemoryTransport to test through the MCP SDK directly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

// Mock logger
vi.mock("../src/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock fetch — we control proxy responses
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("server tool callbacks (via InMemoryTransport)", () => {
  let client: Client;

  beforeEach(async () => {
    process.env["ANTIGRAVITY_URL"] = "http://localhost:8080";
    process.env["ANTIGRAVITY_KEY"] = "test-key";
    mockFetch.mockReset();

    const { server } = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: "test-client", version: "1.0" });

    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  it("chat tool returns success", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello world!" }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 10 },
      }),
    );

    const result = await client.callTool({
      name: "chat",
      arguments: { message: "Hello" },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toBe("Hello world!");
  });

  it("chat tool returns error on proxy failure", async () => {
    mockFetch.mockRejectedValueOnce(
      new TypeError("fetch failed: ECONNREFUSED"),
    );

    const result = await client.callTool({
      name: "chat",
      arguments: { message: "Hello" },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toMatch(/Connection error/);
  });

  it("reason tool returns thinking + answer", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "msg_2",
        type: "message",
        role: "assistant",
        content: [
          { type: "thinking", thinking: "Let me think..." },
          { type: "text", text: "42" },
        ],
        model: "claude-opus-4-6-thinking",
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    );

    const result = await client.callTool({
      name: "reason",
      arguments: { question: "What is the answer?" },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("<thinking>");
    expect(content[0]!.text).toContain("42");
  });

  it("reason tool returns error on failure", async () => {
    mockFetch.mockRejectedValueOnce(
      new TypeError("fetch failed: ECONNREFUSED"),
    );

    const result = await client.callTool({
      name: "reason",
      arguments: { question: "test" },
    });

    expect(result.isError).toBe(true);
  });

  it("code tool returns generated code", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "msg_3",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "```ts\nconsole.log('hi')\n```" }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        usage: { input_tokens: 5, output_tokens: 15 },
      }),
    );

    const result = await client.callTool({
      name: "code",
      arguments: { task: "Write hello world" },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("console.log");
  });

  it("code tool returns error on failure", async () => {
    mockFetch.mockRejectedValueOnce(
      new TypeError("fetch failed: ECONNREFUSED"),
    );

    const result = await client.callTool({
      name: "code",
      arguments: { task: "test" },
    });

    expect(result.isError).toBe(true);
  });

  it("models tool returns model list", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [
          { id: "claude-sonnet-4-6", type: "model", display_name: "Claude Sonnet 4.6" },
        ],
      }),
    );

    const result = await client.callTool({
      name: "models",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("claude-sonnet-4-6");
  });

  it("models tool returns error on failure", async () => {
    mockFetch.mockRejectedValueOnce(
      new TypeError("fetch failed: ECONNREFUSED"),
    );

    const result = await client.callTool({
      name: "models",
      arguments: {},
    });

    expect(result.isError).toBe(true);
  });

  it("status tool returns health info", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: "ok", accounts: 2, uptime: 3600 }),
    );

    const result = await client.callTool({
      name: "status",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content[0]!.text).toContain("Status: ok");
  });

  it("status tool returns error on failure", async () => {
    mockFetch.mockRejectedValueOnce(
      new TypeError("fetch failed: ECONNREFUSED"),
    );

    const result = await client.callTool({
      name: "status",
      arguments: {},
    });

    expect(result.isError).toBe(true);
  });
});
