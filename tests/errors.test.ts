import { describe, it, expect } from "vitest";
import {
  ProxyError,
  AuthError,
  ConnectionError,
  TimeoutError,
  ValidationError,
  parseProxyError,
} from "../src/errors.js";

describe("ProxyError", () => {
  it("sets name, message, statusCode, errorCause", () => {
    const err = new ProxyError("fail", 500, new Error("root"));
    expect(err.name).toBe("ProxyError");
    expect(err.message).toBe("fail");
    expect(err.statusCode).toBe(500);
    expect(err.errorCause).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProxyError);
  });

  it("works without optional params", () => {
    const err = new ProxyError("basic");
    expect(err.statusCode).toBeUndefined();
    expect(err.errorCause).toBeUndefined();
  });
});

describe("AuthError", () => {
  it("extends ProxyError", () => {
    const err = new AuthError("expired", 401);
    expect(err.name).toBe("AuthError");
    expect(err.statusCode).toBe(401);
    expect(err).toBeInstanceOf(ProxyError);
    expect(err).toBeInstanceOf(AuthError);
  });
});

describe("ConnectionError", () => {
  it("extends ProxyError with errorCause", () => {
    const cause = new TypeError("ECONNREFUSED");
    const err = new ConnectionError("cannot connect", cause);
    expect(err.name).toBe("ConnectionError");
    expect(err.errorCause).toBe(cause);
    expect(err.statusCode).toBeUndefined();
    expect(err).toBeInstanceOf(ProxyError);
  });
});

describe("TimeoutError", () => {
  it("has default message", () => {
    const err = new TimeoutError();
    expect(err.name).toBe("TimeoutError");
    expect(err.message).toBe("Request timed out");
    expect(err).toBeInstanceOf(ProxyError);
  });

  it("accepts custom message", () => {
    const err = new TimeoutError("custom timeout");
    expect(err.message).toBe("custom timeout");
  });
});

describe("ValidationError", () => {
  it("sets field", () => {
    const err = new ValidationError("bad input", "message");
    expect(err.name).toBe("ValidationError");
    expect(err.field).toBe("message");
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ProxyError);
  });

  it("works without field", () => {
    const err = new ValidationError("bad");
    expect(err.field).toBeUndefined();
  });
});

describe("parseProxyError", () => {
  it("extracts nested error.message", () => {
    const json = JSON.stringify({ error: { message: "Rate limited" } });
    expect(parseProxyError(json)).toBe("Rate limited");
  });

  it("extracts top-level message", () => {
    const json = JSON.stringify({ message: "Not found" });
    expect(parseProxyError(json)).toBe("Not found");
  });

  it("prefers error.message over top-level message", () => {
    const json = JSON.stringify({
      error: { message: "deep" },
      message: "shallow",
    });
    expect(parseProxyError(json)).toBe("deep");
  });

  it("returns raw text for non-JSON", () => {
    expect(parseProxyError("plain error text")).toBe("plain error text");
  });

  it("truncates long non-JSON to 200 chars", () => {
    const long = "x".repeat(300);
    expect(parseProxyError(long)).toBe("x".repeat(200));
  });

  it("handles JSON without message fields", () => {
    const json = JSON.stringify({ code: 500 });
    expect(parseProxyError(json)).toBe(json.slice(0, 200));
  });

  it("handles error field that is not an object", () => {
    const json = JSON.stringify({ error: "string error" });
    expect(parseProxyError(json)).toBe(json.slice(0, 200));
  });
});
