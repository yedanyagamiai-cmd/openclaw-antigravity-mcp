/**
 * MCP Server core — registers all tools with the official SDK.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { SERVER_NAME, SERVER_VERSION, DEFAULT_PROXY_URL } from "./constants.js";
import {
  createProxyClient,
  validateProxyUrl,
  type ProxyClient,
} from "./proxy/client.js";
import { chatInputSchema, reasonInputSchema, codeInputSchema } from "./schemas/tools.js";
import { handleChat } from "./tools/chat.js";
import { handleReason } from "./tools/reason.js";
import { handleCode } from "./tools/code.js";
import { handleModels } from "./tools/models.js";
import { handleStatus } from "./tools/status.js";
import { logger } from "./logger.js";
import {
  AuthError,
  ConnectionError,
  ProxyError,
  TimeoutError,
  ValidationError,
} from "./errors.js";

/** Resolve proxy configuration from environment */
export function resolveConfig(): { url: string; key: string } {
  const url = process.env["ANTIGRAVITY_URL"] ?? DEFAULT_PROXY_URL;
  const key = process.env["ANTIGRAVITY_KEY"] ?? "";

  if (!key) {
    logger.warn(
      "ANTIGRAVITY_KEY not set — using empty key. Set it in your MCP config env.",
    );
  }

  validateProxyUrl(url);
  return { url, key };
}

/** Format tool errors into user-friendly messages */
export function formatError(err: unknown): string {
  if (err instanceof AuthError) {
    return `Authentication error: ${err.message}`;
  }
  if (err instanceof ConnectionError) {
    return `Connection error: ${err.message}`;
  }
  if (err instanceof TimeoutError) {
    return `Timeout: ${err.message}`;
  }
  if (err instanceof ProxyError) {
    return `Proxy error: ${err.message}`;
  }
  if (err instanceof ValidationError) {
    return `Validation error: ${err.message}`;
  }
  if (err instanceof Error) {
    return `Error: ${err.message}`;
  }
  return `Unknown error: ${String(err)}`;
}

/** Create and configure the MCP server */
export function createServer(): { server: McpServer; client: ProxyClient } {
  const config = resolveConfig();
  const client = createProxyClient(config);

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { logging: {} } },
  );

  // ── Chat Tool ──────────────────────────────────────────────────
  server.tool(
    "chat",
    "Multi-turn conversation with Claude, Gemini, or other models via Antigravity proxy. Supports system prompts, conversation history, and temperature control.",
    chatInputSchema.shape,
    async (rawInput) => {
      try {
        const input = chatInputSchema.parse(rawInput);
        const text = await handleChat(client, input);
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        logger.error("chat tool error", { error: String(err) });
        return {
          content: [{ type: "text" as const, text: formatError(err) }],
          isError: true,
        };
      }
    },
  );

  // ── Reason Tool ────────────────────────────────────────────────
  server.tool(
    "reason",
    "Deep reasoning with extended thinking. Uses Claude Opus for step-by-step analysis. Returns both thinking process and final answer.",
    reasonInputSchema.shape,
    async (rawInput) => {
      try {
        const input = reasonInputSchema.parse(rawInput);
        const text = await handleReason(client, input);
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        logger.error("reason tool error", { error: String(err) });
        return {
          content: [{ type: "text" as const, text: formatError(err) }],
          isError: true,
        };
      }
    },
  );

  // ── Code Tool ──────────────────────────────────────────────────
  server.tool(
    "code",
    "Code generation, review, debugging, refactoring, or explanation. Specify action and optionally provide existing code for context.",
    codeInputSchema.shape,
    async (rawInput) => {
      try {
        const input = codeInputSchema.parse(rawInput);
        const text = await handleCode(client, input);
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        logger.error("code tool error", { error: String(err) });
        return {
          content: [{ type: "text" as const, text: formatError(err) }],
          isError: true,
        };
      }
    },
  );

  // ── Models Tool ────────────────────────────────────────────────
  server.tool(
    "models",
    "List all available AI models on the Antigravity proxy (Claude, Gemini, etc.).",
    {},
    async () => {
      try {
        const text = await handleModels(client);
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        logger.error("models tool error", { error: String(err) });
        return {
          content: [{ type: "text" as const, text: formatError(err) }],
          isError: true,
        };
      }
    },
  );

  // ── Status Tool ────────────────────────────────────────────────
  server.tool(
    "status",
    "Check Antigravity proxy health: connection, latency, account count, uptime.",
    {},
    async () => {
      try {
        const text = await handleStatus(client, config.url);
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        logger.error("status tool error", { error: String(err) });
        return {
          content: [{ type: "text" as const, text: formatError(err) }],
          isError: true,
        };
      }
    },
  );

  return { server, client };
}
