import { describe, it, expect, vi } from "vitest";
import { handleModels } from "../../src/tools/models.js";
import type { ProxyClient } from "../../src/proxy/client.js";

vi.mock("../../src/logger.js", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("handleModels", () => {
  it("returns formatted model list", async () => {
    const client = {
      listModels: vi.fn().mockResolvedValue({
        data: [
          { id: "claude-sonnet-4-6", type: "model", display_name: "Claude Sonnet 4.6" },
          { id: "claude-opus-4-6", type: "model", display_name: "Claude Opus 4.6" },
        ],
      }),
    } as unknown as ProxyClient;

    const result = await handleModels(client);
    expect(result).toContain("Available models (2)");
    expect(result).toContain("- claude-sonnet-4-6 (Claude Sonnet 4.6)");
    expect(result).toContain("- claude-opus-4-6 (Claude Opus 4.6)");
  });

  it("handles models without display_name", async () => {
    const client = {
      listModels: vi.fn().mockResolvedValue({
        data: [{ id: "gpt-4", type: "model" }],
      }),
    } as unknown as ProxyClient;

    const result = await handleModels(client);
    expect(result).toContain("- gpt-4");
    expect(result).not.toContain("(gpt-4)"); // no duplicate
  });

  it("handles empty model list", async () => {
    const client = {
      listModels: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as ProxyClient;

    const result = await handleModels(client);
    expect(result).toContain("No models available");
  });

  it("handles missing data field", async () => {
    const client = {
      listModels: vi.fn().mockResolvedValue({}),
    } as unknown as ProxyClient;

    const result = await handleModels(client);
    expect(result).toContain("No models available");
  });
});
