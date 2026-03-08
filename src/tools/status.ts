/**
 * Status tool — proxy health check with connection info.
 */

import type { ProxyClient } from "../proxy/client.js";
import { logger } from "../logger.js";

export async function handleStatus(
  client: ProxyClient,
  proxyUrl: string,
): Promise<string> {
  logger.info("checking proxy status");

  const start = Date.now();
  const health = await client.health();
  const latency = Date.now() - start;

  const lines = [
    `Status: ${health.status ?? "unknown"}`,
    `Proxy: ${proxyUrl}`,
    `Latency: ${latency}ms`,
  ];

  if (typeof health.accounts === "number") {
    lines.push(`Accounts: ${health.accounts}`);
  }
  if (typeof health.uptime === "number") {
    lines.push(`Uptime: ${Math.round(health.uptime / 60)}min`);
  }

  logger.info("proxy status", {
    status: health.status,
    latencyMs: latency,
    accounts: health.accounts,
  });

  return lines.join("\n");
}
