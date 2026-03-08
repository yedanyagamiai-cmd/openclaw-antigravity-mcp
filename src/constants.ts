/** Default proxy URL when ANTIGRAVITY_URL is not set */
export const DEFAULT_PROXY_URL = "http://localhost:8080";

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Maximum retry attempts for transient failures */
export const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
export const RETRY_BASE_DELAY_MS = 1_000;

/** Maximum input message length (characters) */
export const MAX_MESSAGE_LENGTH = 100_000;

/** Maximum number of messages in a conversation */
export const MAX_MESSAGES = 50;

/** Default model for chat */
export const DEFAULT_CHAT_MODEL = "claude-sonnet-4-6";

/** Default model for reasoning */
export const DEFAULT_REASON_MODEL = "claude-opus-4-6-thinking";

/** Default model for code */
export const DEFAULT_CODE_MODEL = "claude-sonnet-4-6";

/** Server name */
export const SERVER_NAME = "openclaw-antigravity-mcp";

/** Server version — keep in sync with package.json */
export const SERVER_VERSION = "2.0.0";

/** Anthropic API version */
export const ANTHROPIC_API_VERSION = "2023-06-01";
