/**
 * Zod schemas for all tool inputs.
 * Every tool input is validated before execution.
 */

import { z } from "zod";
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_CODE_MODEL,
  DEFAULT_REASON_MODEL,
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES,
} from "../constants.js";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const chatInputSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(MAX_MESSAGE_LENGTH, `Message exceeds ${MAX_MESSAGE_LENGTH} chars`),
  model: z.string().optional().default(DEFAULT_CHAT_MODEL),
  system: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  history: z.array(messageSchema).max(MAX_MESSAGES).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const reasonInputSchema = z.object({
  question: z
    .string()
    .min(1, "Question cannot be empty")
    .max(MAX_MESSAGE_LENGTH, `Question exceeds ${MAX_MESSAGE_LENGTH} chars`),
  model: z.string().optional().default(DEFAULT_REASON_MODEL),
  context: z.string().max(MAX_MESSAGE_LENGTH).optional(),
});

export const codeInputSchema = z.object({
  task: z
    .string()
    .min(1, "Task cannot be empty")
    .max(MAX_MESSAGE_LENGTH, `Task exceeds ${MAX_MESSAGE_LENGTH} chars`),
  language: z.string().optional(),
  code: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  model: z.string().optional().default(DEFAULT_CODE_MODEL),
  action: z
    .enum(["generate", "review", "debug", "refactor", "explain"])
    .optional()
    .default("generate"),
});

/** Re-export schemas as a map for registration */
export const toolSchemas = {
  chat: chatInputSchema,
  reason: reasonInputSchema,
  code: codeInputSchema,
} as const;

export type ChatInput = z.infer<typeof chatInputSchema>;
export type ReasonInput = z.infer<typeof reasonInputSchema>;
export type CodeInput = z.infer<typeof codeInputSchema>;
