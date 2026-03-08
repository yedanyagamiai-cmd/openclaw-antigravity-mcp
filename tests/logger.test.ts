import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    vi.resetModules();
  });

  it("writes structured JSON to stderr", async () => {
    const { logger } = await import("../src/logger.js");

    logger.info("test message", { key: "value" });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output.trim());
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("test message");
    expect(parsed.key).toBe("value");
    expect(parsed.ts).toBeDefined();
  });

  it("logs all levels", async () => {
    const { logger } = await import("../src/logger.js");

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(stderrSpy).toHaveBeenCalledTimes(4);

    const levels = stderrSpy.mock.calls.map((call) => {
      const parsed = JSON.parse((call[0] as string).trim());
      return parsed.level;
    });
    expect(levels).toEqual(["debug", "info", "warn", "error"]);
  });

  it("works without data parameter", async () => {
    const { logger } = await import("../src/logger.js");

    logger.info("no data");

    const output = stderrSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(output.trim());
    expect(parsed.msg).toBe("no data");
    expect(parsed.level).toBe("info");
  });
});
