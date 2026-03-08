/**
 * Reason tool — deep reasoning with extended thinking extraction.
 */

import type { ProxyClient } from "../proxy/client.js";
import type { ReasonInput } from "../schemas/tools.js";
import { logger } from "../logger.js";

export async function handleReason(
  client: ProxyClient,
  input: ReasonInput,
): Promise<string> {
  const userContent = input.context
    ? `Context:\n${input.context}\n\nQuestion:\n${input.question}`
    : input.question;

  logger.info("reason request", { model: input.model });

  const res = await client.chat({
    model: input.model,
    messages: [{ role: "user", content: userContent }],
    max_tokens: 16384,
    system:
      "You are a deep reasoning assistant. Think step by step. Show your reasoning process clearly.",
  });

  const parts: string[] = [];
  for (const block of res.content) {
    if (block.type === "thinking") {
      parts.push(`<thinking>\n${block.thinking}\n</thinking>`);
    } else if (block.type === "text") {
      parts.push(block.text);
    }
  }

  logger.info("reason response", {
    model: res.model,
    tokens: res.usage.output_tokens,
    hasThinking: res.content.some((b) => b.type === "thinking"),
  });

  return parts.join("\n\n") || "(empty response)";
}
