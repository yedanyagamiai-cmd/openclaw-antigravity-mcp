/**
 * Entry point — starts the MCP server with stdio transport.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./logger.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";

async function main(): Promise<void> {
  logger.info("starting", { name: SERVER_NAME, version: SERVER_VERSION });

  const { server } = createServer();
  const transport = new StdioServerTransport();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("shutting down");
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await server.connect(transport);
  logger.info("connected via stdio");
}

main().catch((err) => {
  logger.error("fatal", { error: String(err) });
  process.exit(1);
});
