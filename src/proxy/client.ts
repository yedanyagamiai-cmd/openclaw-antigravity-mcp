/**
 * Proxy client with retry, timeout, and structured error handling.
 */

import {
  AuthError,
  ConnectionError,
  ProxyError,
  TimeoutError,
  parseProxyError,
} from "../errors.js";
import { logger } from "../logger.js";
import {
  ANTHROPIC_API_VERSION,
  MAX_RETRIES,
  REQUEST_TIMEOUT_MS,
  RETRY_BASE_DELAY_MS,
} from "../constants.js";
import type {
  HealthResponse,
  MessagesRequest,
  MessagesResponse,
  ModelsResponse,
} from "./types.js";

export interface ProxyConfig {
  url: string;
  key: string;
  timeoutMs?: number;
  maxRetries?: number;
}

/** Validate proxy URL format */
export function validateProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Invalid protocol: ${parsed.protocol}`);
    }
    return parsed.origin;
  } catch (err) {
    throw new ConnectionError(
      `Invalid proxy URL "${url}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Create a proxy client instance */
export function createProxyClient(config: ProxyConfig) {
  const baseUrl = validateProxyUrl(config.url);
  const timeout = config.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? MAX_RETRIES;

  async function request<T>(
    path: string,
    options: RequestInit = {},
    retryable = true,
  ): Promise<T> {
    let lastError: Error | undefined;

    const attempts = retryable ? maxRetries : 1;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(`${baseUrl}${path}`, {
          ...options,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${config.key}`,
            "Content-Type": "application/json",
            "anthropic-version": ANTHROPIC_API_VERSION,
            ...options.headers,
          },
        });

        if (!res.ok) {
          const text = await res.text();
          const msg = parseProxyError(text);

          if (res.status === 401 || res.status === 403) {
            throw new AuthError(
              `Auth failed (${res.status}): ${msg}. Re-login in Antigravity app.`,
              res.status,
            );
          }

          if (
            msg.toLowerCase().includes("no auth") ||
            msg.toLowerCase().includes("auth")
          ) {
            throw new AuthError(
              `Auth expired: ${msg}. Re-login in Antigravity app, then restart proxy.`,
              res.status,
            );
          }

          // 429 and 5xx are retryable
          if (
            (res.status === 429 || res.status >= 500) &&
            attempt < attempts
          ) {
            lastError = new ProxyError(
              `Proxy error (${res.status}): ${msg}`,
              res.status,
            );
            const delay =
              RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) +
              Math.random() * 500;
            logger.warn("retrying request", {
              path,
              attempt,
              status: res.status,
              delayMs: Math.round(delay),
            });
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          throw new ProxyError(
            `Proxy error (${res.status}): ${msg}`,
            res.status,
          );
        }

        return (await res.json()) as T;
      } catch (err) {
        if (err instanceof AuthError || err instanceof ProxyError) {
          throw err;
        }

        if (err instanceof Error && err.name === "AbortError") {
          throw new TimeoutError(
            `Proxy timeout (${timeout / 1000}s). Is your proxy running? Try: acc start`,
          );
        }

        if (
          err instanceof TypeError &&
          (err.message.includes("fetch") ||
            err.message.includes("ECONNREFUSED"))
        ) {
          throw new ConnectionError(
            `Cannot connect to ${baseUrl}. Start your proxy: acc start`,
            err,
          );
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < attempts) {
          const delay =
            RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) +
            Math.random() * 500;
          logger.warn("retrying after error", {
            path,
            attempt,
            error: lastError.message,
          });
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError ?? new ProxyError("Request failed after retries");
  }

  return {
    /** Send a messages request to the proxy */
    async chat(body: MessagesRequest): Promise<MessagesResponse> {
      return request<MessagesResponse>("/v1/messages", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    /** List available models */
    async listModels(): Promise<ModelsResponse> {
      return request<ModelsResponse>("/v1/models", {}, false);
    },

    /** Get proxy health status */
    async health(): Promise<HealthResponse> {
      return request<HealthResponse>("/health", {}, false);
    },
  };
}

export type ProxyClient = ReturnType<typeof createProxyClient>;
