/**
 * Custom error hierarchy for structured error handling.
 * Pattern: "Logic throws, handlers catch."
 */

/** Base error for all proxy-related failures */
export class ProxyError extends Error {
  public readonly statusCode?: number | undefined;
  public readonly errorCause?: unknown;
  constructor(
    message: string,
    statusCode?: number,
    errorCause?: unknown,
  ) {
    super(message);
    this.name = "ProxyError";
    this.statusCode = statusCode;
    this.errorCause = errorCause;
  }
}

/** Authentication failed or expired */
export class AuthError extends ProxyError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = "AuthError";
  }
}

/** Connection to proxy refused or timed out */
export class ConnectionError extends ProxyError {
  constructor(message: string, errorCause?: unknown) {
    super(message, undefined, errorCause);
    this.name = "ConnectionError";
  }
}

/** Request timed out */
export class TimeoutError extends ProxyError {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Input validation failed */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Format proxy error response body into human-readable message */
export function parseProxyError(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    const obj = parsed as Record<string, unknown>;
    if (typeof obj === "object" && obj !== null) {
      const errField = obj["error"];
      if (typeof errField === "object" && errField !== null) {
        const errObj = errField as Record<string, unknown>;
        const msg = errObj["message"];
        if (typeof msg === "string") return msg;
      }
      const msgField = obj["message"];
      if (typeof msgField === "string") return msgField;
    }
  } catch {
    // not JSON
  }
  return text.slice(0, 200);
}
