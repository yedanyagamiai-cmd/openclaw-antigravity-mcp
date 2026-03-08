/**
 * Chat tool — multi-turn conversation with model selection.
 */

import type { ProxyClient } from "../proxy/client.js";
import type { ChatInput } from "../schemas/tools.js";
import { logger } from "../logger.js";

export async function handleChat(
  client: ProxyClient,
  input: ChatInput,
): Promise<string> {
  const messages = [
    ...(input.history ?? []),
    { role: "user" as const, content: input.message },
  ];

  logger.info("chat request", { model: input.model, messageCount: messages.length });

  const res = await client.chat({
    model: input.model,
    messages,
    max_tokens: 8192,
    system: input.system,
    temperature: input.temperature,
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  logger.info("chat response", {
    model: res.model,
    tokens: res.usage.output_tokens,
  });

  return text || "(empty response)";
}
