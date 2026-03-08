import { describe, it, expect } from "vitest";
import { spawn } from "child_process";
import { join } from "path";

function sendJsonRpc(
  proc: ReturnType<typeof spawn>,
  method: string,
  params: Record<string, unknown> = {},
  id = 1,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params, id }) + "\n";
    let buffer = "";

    const onData = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.id === id) {
            proc.stdout!.off("data", onData);
            resolve(parsed);
            return;
          }
        } catch {
          // not complete JSON yet
        }
      }
    };

    proc.stdout!.on("data", onData);
    proc.stdin!.write(msg);

    setTimeout(() => {
      proc.stdout!.off("data", onData);
      reject(new Error(`Timeout waiting for response to ${method}`));
    }, 10000);
  });
}

function spawnServer(): ReturnType<typeof spawn> {
  const distPath = join(__dirname, "..", "dist", "index.js");
  return spawn("node", [distPath], {
    env: {
      ...process.env,
      ANTIGRAVITY_URL: "http://localhost:19999", // non-existent, that's fine for protocol tests
      ANTIGRAVITY_KEY: "test-key",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("e2e MCP protocol", () => {
  it("responds to initialize", async () => {
    const proc = spawnServer();

    try {
      const res = await sendJsonRpc(proc, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      });

      expect(res["jsonrpc"]).toBe("2.0");
      const result = res["result"] as Record<string, unknown>;
      expect(result).toBeDefined();
      expect(result["protocolVersion"]).toBeDefined();

      const serverInfo = result["serverInfo"] as Record<string, string>;
      expect(serverInfo["name"]).toBe("openclaw-antigravity-mcp");
      expect(serverInfo["version"]).toBe("2.0.0");
    } finally {
      proc.kill();
    }
  });

  it("lists all 5 tools", async () => {
    const proc = spawnServer();

    try {
      // Initialize first
      await sendJsonRpc(proc, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      });

      // Send initialized notification (no response expected)
      proc.stdin!.write(
        JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
      );

      // List tools
      const res = await sendJsonRpc(proc, "tools/list", {}, 2);
      const result = res["result"] as Record<string, unknown>;
      const tools = result["tools"] as Array<Record<string, unknown>>;

      expect(tools).toHaveLength(5);

      const names = tools.map((t) => t["name"]);
      expect(names).toContain("chat");
      expect(names).toContain("reason");
      expect(names).toContain("code");
      expect(names).toContain("models");
      expect(names).toContain("status");

      // Verify chat tool has proper schema
      const chatTool = tools.find((t) => t["name"] === "chat")!;
      const schema = chatTool["inputSchema"] as Record<string, unknown>;
      expect(schema["type"]).toBe("object");
      const props = schema["properties"] as Record<string, unknown>;
      expect(props["message"]).toBeDefined();
    } finally {
      proc.kill();
    }
  });

  it("tools/call returns error for connection failure", async () => {
    const proc = spawnServer();

    try {
      await sendJsonRpc(proc, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      });

      proc.stdin!.write(
        JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
      );

      // Call status tool — will fail because proxy is not running on port 19999
      const res = await sendJsonRpc(
        proc,
        "tools/call",
        { name: "status", arguments: {} },
        3,
      );

      const result = res["result"] as Record<string, unknown>;
      // Should return isError: true with connection error
      expect(result["isError"]).toBe(true);
      const content = result["content"] as Array<Record<string, string>>;
      expect(content[0]!["text"]).toMatch(/error/i);
    } finally {
      proc.kill();
    }
  });

  it("tools/call returns error for models on connection failure", async () => {
    const proc = spawnServer();

    try {
      await sendJsonRpc(proc, "initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      });

      proc.stdin!.write(
        JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n",
      );

      const res = await sendJsonRpc(
        proc,
        "tools/call",
        { name: "models", arguments: {} },
        4,
      );

      const result = res["result"] as Record<string, unknown>;
      expect(result["isError"]).toBe(true);
    } finally {
      proc.kill();
    }
  });
});
