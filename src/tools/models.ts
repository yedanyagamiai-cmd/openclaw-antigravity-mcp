/**
 * Models tool — list available models from the proxy.
 */

import type { ProxyClient } from "../proxy/client.js";
import { logger } from "../logger.js";

export async function handleModels(client: ProxyClient): Promise<string> {
  logger.info("listing models");

  const res = await client.listModels();
  const models = res.data ?? [];

  if (models.length === 0) {
    return "No models available. Check your Antigravity proxy and Google account login.";
  }

  const lines = models.map((m) => {
    const name = m.display_name ?? m.id;
    return `- ${m.id}${name !== m.id ? ` (${name})` : ""}`;
  });

  logger.info("models listed", { count: models.length });
  return `Available models (${models.length}):\n${lines.join("\n")}`;
}
