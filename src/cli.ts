/**
 * CLI entry point — handles --test, --help, --version flags.
 * When no flags: starts the MCP server (delegates to index.ts).
 */

import { SERVER_NAME, SERVER_VERSION, DEFAULT_PROXY_URL } from "./constants.js";
import { createProxyClient, validateProxyUrl } from "./proxy/client.js";


const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(`${SERVER_NAME} v${SERVER_VERSION}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
${SERVER_NAME} v${SERVER_VERSION}
MCP server for Antigravity Claude Proxy

USAGE:
  npx ${SERVER_NAME}              Start MCP server (stdio transport)
  npx ${SERVER_NAME} --test       Test proxy connection
  npx ${SERVER_NAME} --version    Show version

ENVIRONMENT:
  ANTIGRAVITY_URL   Proxy URL (default: ${DEFAULT_PROXY_URL})
  ANTIGRAVITY_KEY   API key for the proxy

CONFIGURATION (claude_desktop_config.json / settings.json):
  {
    "mcpServers": {
      "antigravity": {
        "command": "npx",
        "args": ["-y", "${SERVER_NAME}"],
        "env": {
          "ANTIGRAVITY_URL": "${DEFAULT_PROXY_URL}",
          "ANTIGRAVITY_KEY": "your-key"
        }
      }
    }
  }
`);
  process.exit(0);
}

if (args.includes("--test")) {
  runTest().catch((err) => {
    console.error(`\nFATAL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
} else {
  // Default: start MCP server
  import("./index.js");
}

async function runTest(): Promise<void> {
  const url = process.env["ANTIGRAVITY_URL"] ?? DEFAULT_PROXY_URL;
  const key = process.env["ANTIGRAVITY_KEY"] ?? "";

  console.log(`\n${SERVER_NAME} v${SERVER_VERSION} — Connection Test\n`);
  console.log(`  Proxy URL:  ${url}`);
  console.log(`  API Key:    ${key ? key.slice(0, 4) + "..." : "(not set)"}`);
  console.log("");

  let pass = 0;
  let warn = 0;
  let fail = 0;

  // Step 1: URL validation
  process.stdout.write("  [1/4] URL validation ... ");
  try {
    validateProxyUrl(url);
    console.log("PASS");
    pass++;
  } catch (err) {
    console.log(`FAIL — ${err instanceof Error ? err.message : String(err)}`);
    fail++;
    showSummary(pass, warn, fail);
    return;
  }

  const client = createProxyClient({ url, key, maxRetries: 1 });

  // Step 2: Health check
  process.stdout.write("  [2/4] Health check ... ");
  try {
    const start = Date.now();
    const health = await client.health();
    const ms = Date.now() - start;
    console.log(
      `PASS (${health.status}, ${ms}ms${health.accounts != null ? `, ${health.accounts} account(s)` : ""})`,
    );
    pass++;
  } catch (err) {
    console.log(`FAIL — ${err instanceof Error ? err.message : String(err)}`);
    fail++;
  }

  // Step 3: Model listing
  process.stdout.write("  [3/4] Model listing ... ");
  try {
    const models = await client.listModels();
    const count = models.data?.length ?? 0;
    if (count > 0) {
      console.log(`PASS (${count} models)`);
      pass++;
    } else {
      console.log("WARN — 0 models (auth may be expired)");
      warn++;
    }
  } catch (err) {
    console.log(`WARN — ${err instanceof Error ? err.message : String(err)}`);
    warn++;
  }

  // Step 4: API key
  process.stdout.write("  [4/4] API key ... ");
  if (key) {
    console.log("PASS");
    pass++;
  } else {
    console.log("WARN — ANTIGRAVITY_KEY not set (using default)");
    warn++;
  }

  showSummary(pass, warn, fail);
}

function showSummary(pass: number, warn: number, fail: number): void {
  console.log(
    `\n  Result: ${pass} pass, ${warn} warn, ${fail} fail\n`,
  );
  if (fail > 0) {
    process.exit(1);
  }
}
