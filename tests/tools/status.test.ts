import { describe, it, expect, vi } from "vitest";
import { handleStatus } from "../../src/tools/status.js";
import type { ProxyClient } from "../../src/proxy/client.js";

vi.mock("../../src/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("handleStatus", () => {
  it("returns formatted status", async () => {
    const client = {
      health: vi.fn().mockResolvedValue({
        status: "ok",
        accounts: 3,
        uptime: 7200,
      }),
    } as unknown as ProxyClient;

    const result = await handleStatus(client, "http://localhost:8080");
    expect(result).toContain("Status: ok");
    expect(result).toContain("Proxy: http://localhost:8080");
    expect(result).toContain("Latency:");
    expect(result).toContain("Accounts: 3");
    expect(result).toContain("Uptime: 120min");
  });

  it("omits accounts if not present", async () => {
    const client = {
      health: vi.fn().mockResolvedValue({ status: "ok" }),
    } as unknown as ProxyClient;

    const result = await handleStatus(client, "http://proxy.local");
    expect(result).toContain("Status: ok");
    expect(result).not.toContain("Accounts:");
    expect(result).not.toContain("Uptime:");
  });

  it("handles unknown status", async () => {
    const client = {
      health: vi.fn().mockResolvedValue({}),
    } as unknown as ProxyClient;

    const result = await handleStatus(client, "http://test");
    expect(result).toContain("Status: unknown");
  });
});
