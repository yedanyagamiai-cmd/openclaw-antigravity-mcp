/**
 * Code tool — generation, review, debugging, refactoring, explanation.
 */

import type { ProxyClient } from "../proxy/client.js";
import type { CodeInput } from "../schemas/tools.js";
import { logger } from "../logger.js";

const SYSTEM_PROMPTS: Record<string, string> = {
  generate:
    "You are an expert programmer. Generate clean, well-documented code. Include comments for complex logic.",
  review:
    "You are a senior code reviewer. Analyze the code for bugs, security issues, performance problems, and style. Be specific and actionable.",
  debug:
    "You are a debugging expert. Identify the root cause of the issue and provide a clear fix with explanation.",
  refactor:
    "You are a refactoring specialist. Improve the code structure, readability, and maintainability while preserving behavior.",
  explain:
    "You are a code educator. Explain the code clearly, covering what it does, how it works, and why it's written this way.",
};

export async function handleCode(
  client: ProxyClient,
  input: CodeInput,
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[input.action] ?? SYSTEM_PROMPTS["generate"] ?? "";

  let userContent = `Task: ${input.task}`;
  if (input.language) {
    userContent += `\nLanguage: ${input.language}`;
  }
  if (input.code) {
    userContent += `\n\nCode:\n\`\`\`\n${input.code}\n\`\`\``;
  }

  logger.info("code request", { model: input.model, action: input.action });

  const res = await client.chat({
    model: input.model,
    messages: [{ role: "user", content: userContent }],
    max_tokens: 8192,
    system: systemPrompt,
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  logger.info("code response", {
    model: res.model,
    tokens: res.usage.output_tokens,
    action: input.action,
  });

  return text || "(empty response)";
}
