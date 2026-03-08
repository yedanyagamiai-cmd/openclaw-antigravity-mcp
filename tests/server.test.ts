import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveConfig, createServer, formatError } from "../src/server.js";
import {
  AuthError,
  ConnectionError,
  TimeoutError,
  ProxyError,
  ValidationError,
} from "../src/errors.js";

// Mock logger
vi.mock("../src/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock fetch for proxy client
vi.stubGlobal("fetch", vi.fn());

describe("resolveConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses defaults when env vars not set", () => {
    delete process.env["ANTIGRAVITY_URL"];
    delete process.env["ANTIGRAVITY_KEY"];

    const config = resolveConfig();
    expect(config.url).toBe("http://localhost:8080");
    expect(config.key).toBe("");
  });

  it("reads env vars", () => {
    process.env["ANTIGRAVITY_URL"] = "http://my-proxy:9090";
    process.env["ANTIGRAVITY_KEY"] = "my-secret-key";

    const config = resolveConfig();
    expect(config.url).toBe("http://my-proxy:9090");
    expect(config.key).toBe("my-secret-key");
  });

  it("throws on invalid URL", () => {
    process.env["ANTIGRAVITY_URL"] = "not-a-url";
    expect(() => resolveConfig()).toThrow();
  });
});

describe("formatError", () => {
  it("formats AuthError", () => {
    expect(formatError(new AuthError("token expired", 401))).toBe(
      "Authentication error: token expired",
    );
  });

  it("formats ConnectionError", () => {
    expect(formatError(new ConnectionError("refused"))).toBe(
      "Connection error: refused",
    );
  });

  it("formats TimeoutError", () => {
    expect(formatError(new TimeoutError("too slow"))).toBe("Timeout: too slow");
  });

  it("formats ProxyError (non-subclass)", () => {
    expect(formatError(new ProxyError("bad gateway", 502))).toBe(
      "Proxy error: bad gateway",
    );
  });

  it("formats ValidationError", () => {
    expect(formatError(new ValidationError("invalid field"))).toBe(
      "Validation error: invalid field",
    );
  });

  it("formats generic Error", () => {
    expect(formatError(new Error("something broke"))).toBe(
      "Error: something broke",
    );
  });

  it("formats non-Error values", () => {
    expect(formatError("string error")).toBe("Unknown error: string error");
    expect(formatError(42)).toBe("Unknown error: 42");
    expect(formatError(null)).toBe("Unknown error: null");
    expect(formatError(undefined)).toBe("Unknown error: undefined");
  });

  it("AuthError takes precedence over ProxyError check", () => {
    const err = new AuthError("test", 401);
    expect(err).toBeInstanceOf(ProxyError);
    expect(formatError(err)).toMatch(/^Authentication error:/);
  });

  it("ConnectionError takes precedence over ProxyError check", () => {
    const err = new ConnectionError("test");
    expect(err).toBeInstanceOf(ProxyError);
    expect(formatError(err)).toMatch(/^Connection error:/);
  });

  it("TimeoutError takes precedence over ProxyError check", () => {
    const err = new TimeoutError("test");
    expect(err).toBeInstanceOf(ProxyError);
    expect(formatError(err)).toMatch(/^Timeout:/);
  });
});

describe("createServer", () => {
  beforeEach(() => {
    process.env["ANTIGRAVITY_URL"] = "http://localhost:8080";
    process.env["ANTIGRAVITY_KEY"] = "test-key";
  });

  it("creates server and client", () => {
    const { server, client } = createServer();
    expect(server).toBeDefined();
    expect(client).toBeDefined();
  });
});
