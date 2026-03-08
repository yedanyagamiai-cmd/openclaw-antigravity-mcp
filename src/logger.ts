/**
 * Structured logger that writes to stderr (MCP protocol requires stdout for JSON-RPC).
 * All application logs MUST go through this module.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function write(entry: LogEntry): void {
  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  debug(msg: string, data?: Record<string, unknown>): void {
    write({ level: "debug", msg, ts: new Date().toISOString(), ...data });
  },
  info(msg: string, data?: Record<string, unknown>): void {
    write({ level: "info", msg, ts: new Date().toISOString(), ...data });
  },
  warn(msg: string, data?: Record<string, unknown>): void {
    write({ level: "warn", msg, ts: new Date().toISOString(), ...data });
  },
  error(msg: string, data?: Record<string, unknown>): void {
    write({ level: "error", msg, ts: new Date().toISOString(), ...data });
  },
};
