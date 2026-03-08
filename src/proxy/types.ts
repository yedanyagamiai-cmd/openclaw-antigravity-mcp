/** Anthropic Messages API types used by the Antigravity proxy */

export interface MessageContent {
  type: "text";
  text: string;
}

export interface ThinkingContent {
  type: "thinking";
  thinking: string;
}

export type ContentBlock = MessageContent | ThinkingContent;

export interface MessagesRequest {
  model: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  max_tokens: number;
  system?: string | undefined;
  temperature?: number | undefined;
}

export interface MessagesResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ContentBlock[];
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  type: string;
  display_name?: string;
  created_at?: string;
}

export interface ModelsResponse {
  data: ModelInfo[];
}

export interface HealthResponse {
  status: string;
  accounts?: number;
  uptime?: number;
  latency_ms?: number;
  [key: string]: unknown;
}
