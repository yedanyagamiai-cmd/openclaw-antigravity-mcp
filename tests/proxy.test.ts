import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createProxyClient,
  validateProxyUrl,
} from "../src/proxy/client.js";
import { AuthError, ConnectionError, TimeoutError, ProxyError } from "../src/errors.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Suppress logger output in tests
vi.mock("../src/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(text: string, status: number): Response {
  return new Response(text, { status });
}

describe("validateProxyUrl", () => {
  it("accepts http URL", () => {
    expect(validateProxyUrl("http://localhost:8080")).toBe("http://localhost:8080");
  });

  it("accepts https URL", () => {
    expect(validateProxyUrl("https://proxy.example.com")).toBe("https://proxy.example.com");
  });

  it("strips path from URL", () => {
    expect(validateProxyUrl("http://localhost:8080/v1/test")).toBe("http://localhost:8080");
  });

  it("rejects non-http protocols", () => {
    expect(() => validateProxyUrl("ftp://example.com")).toThrow(ConnectionError);
  });

  it("rejects invalid URLs", () => {
    expect(() => validateProxyUrl("not-a-url")).toThrow(ConnectionError);
  });
});

describe("createProxyClient", () => {
  let client: ReturnType<typeof createProxyClient>;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createProxyClient({
      url: "http://localhost:8080",
      key: "test-key",
      timeoutMs: 5000,
      maxRetries: 2,
    });
  });

  describe("chat()", () => {
    it("sends correct request and returns response", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello!" }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockResponse));

      const result = await client.chat({
        model: "claude-sonnet-4-6",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 1024,
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, opts] = mockFetch.mock.calls[0]!;
      expect(url).toBe("http://localhost:8080/v1/messages");
      expect(opts.method).toBe("POST");
      expect(opts.headers["Authorization"]).toBe("Bearer test-key");
      expect(opts.headers["anthropic-version"]).toBe("2023-06-01");
    });
  });

  describe("listModels()", () => {
    it("returns model list", async () => {
      const mockModels = { data: [{ id: "claude-sonnet-4-6", type: "model" }] };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockModels));

      const result = await client.listModels();
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe("claude-sonnet-4-6");
    });

    it("does not retry on failure (non-retryable)", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Server error", 500));

      await expect(client.listModels()).rejects.toThrow(ProxyError);
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  describe("health()", () => {
    it("returns health data", async () => {
      const mockHealth = { status: "ok", accounts: 3, uptime: 3600 };
      mockFetch.mockResolvedValueOnce(jsonResponse(mockHealth));

      const result = await client.health();
      expect(result.status).toBe("ok");
      expect(result.accounts).toBe(3);
    });
  });

  describe("error handling", () => {
    it("throws AuthError on 401", async () => {
      mockFetch.mockResolvedValueOnce(
        textResponse(JSON.stringify({ message: "Unauthorized" }), 401),
      );

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(AuthError);
    });

    it("throws AuthError on 403", async () => {
      mockFetch.mockResolvedValueOnce(
        textResponse(JSON.stringify({ message: "Forbidden" }), 403),
      );

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(AuthError);
    });

    it("throws AuthError when response contains auth-related message", async () => {
      mockFetch.mockResolvedValueOnce(
        textResponse(JSON.stringify({ message: "No Auth token found" }), 400),
      );

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(AuthError);
    });

    it("throws ProxyError on non-retryable HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce(
        textResponse(JSON.stringify({ message: "Bad request" }), 400),
      );

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(ProxyError);
    });

    it("retries on 429 then succeeds", async () => {
      mockFetch.mockResolvedValueOnce(
        textResponse(JSON.stringify({ message: "Rate limited" }), 429),
      );
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: "msg_1",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "ok" }],
          model: "claude-sonnet-4-6",
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );

      const result = await client.chat({
        model: "claude-sonnet-4-6",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      });

      expect(result.content[0]!.text).toBe("ok");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("retries on 500 then throws after max retries", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(textResponse(JSON.stringify({ message: "Internal error" }), 500)),
      );

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(ProxyError);

      // maxRetries=2 → 2 attempts total
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws ConnectionError on ECONNREFUSED", async () => {
      mockFetch.mockRejectedValueOnce(
        new TypeError("fetch failed: ECONNREFUSED"),
      );

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(ConnectionError);
    });

    it("throws TimeoutError on AbortError", async () => {
      const abortErr = new Error("The operation was aborted");
      abortErr.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortErr);

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(TimeoutError);
    });

    it("retries on unknown errors then throws", async () => {
      mockFetch.mockRejectedValue(new Error("random network glitch"));

      await expect(client.chat({
        model: "x",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 100,
      })).rejects.toThrow(Error);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
