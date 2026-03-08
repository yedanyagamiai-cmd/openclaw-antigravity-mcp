import { describe, it, expect } from "vitest";
import {
  chatInputSchema,
  reasonInputSchema,
  codeInputSchema,
} from "../src/schemas/tools.js";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_REASON_MODEL,
  DEFAULT_CODE_MODEL,
} from "../src/constants.js";

describe("chatInputSchema", () => {
  it("parses valid minimal input", () => {
    const result = chatInputSchema.parse({ message: "hello" });
    expect(result.message).toBe("hello");
    expect(result.model).toBe(DEFAULT_CHAT_MODEL);
  });

  it("parses full input", () => {
    const result = chatInputSchema.parse({
      message: "hello",
      model: "custom-model",
      system: "You are helpful",
      history: [{ role: "user", content: "hi" }, { role: "assistant", content: "hey" }],
      temperature: 0.7,
    });
    expect(result.model).toBe("custom-model");
    expect(result.system).toBe("You are helpful");
    expect(result.history).toHaveLength(2);
    expect(result.temperature).toBe(0.7);
  });

  it("rejects empty message", () => {
    expect(() => chatInputSchema.parse({ message: "" })).toThrow();
  });

  it("rejects missing message", () => {
    expect(() => chatInputSchema.parse({})).toThrow();
  });

  it("rejects temperature out of range", () => {
    expect(() => chatInputSchema.parse({ message: "hi", temperature: 3 })).toThrow();
    expect(() => chatInputSchema.parse({ message: "hi", temperature: -1 })).toThrow();
  });

  it("rejects invalid history role", () => {
    expect(() =>
      chatInputSchema.parse({
        message: "hi",
        history: [{ role: "system", content: "x" }],
      }),
    ).toThrow();
  });

  it("rejects too many history messages", () => {
    const history = Array.from({ length: 51 }, (_, i) => ({
      role: "user" as const,
      content: `msg ${i}`,
    }));
    expect(() => chatInputSchema.parse({ message: "hi", history })).toThrow();
  });
});

describe("reasonInputSchema", () => {
  it("parses valid minimal input", () => {
    const result = reasonInputSchema.parse({ question: "why?" });
    expect(result.question).toBe("why?");
    expect(result.model).toBe(DEFAULT_REASON_MODEL);
  });

  it("parses with context", () => {
    const result = reasonInputSchema.parse({
      question: "why?",
      context: "Given X=5",
      model: "custom",
    });
    expect(result.context).toBe("Given X=5");
    expect(result.model).toBe("custom");
  });

  it("rejects empty question", () => {
    expect(() => reasonInputSchema.parse({ question: "" })).toThrow();
  });
});

describe("codeInputSchema", () => {
  it("parses valid minimal input", () => {
    const result = codeInputSchema.parse({ task: "write hello world" });
    expect(result.task).toBe("write hello world");
    expect(result.model).toBe(DEFAULT_CODE_MODEL);
    expect(result.action).toBe("generate");
  });

  it("parses all actions", () => {
    for (const action of ["generate", "review", "debug", "refactor", "explain"] as const) {
      const result = codeInputSchema.parse({ task: "test", action });
      expect(result.action).toBe(action);
    }
  });

  it("rejects invalid action", () => {
    expect(() => codeInputSchema.parse({ task: "test", action: "invalid" })).toThrow();
  });

  it("rejects empty task", () => {
    expect(() => codeInputSchema.parse({ task: "" })).toThrow();
  });

  it("includes optional code and language", () => {
    const result = codeInputSchema.parse({
      task: "review",
      code: "const x = 1;",
      language: "typescript",
      action: "review",
    });
    expect(result.code).toBe("const x = 1;");
    expect(result.language).toBe("typescript");
  });
});
