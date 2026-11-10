import { randomUUID } from "node:crypto";

type LogFields = Record<string, unknown>;
type LogLevel = "debug" | "info" | "warn" | "error";

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => write("debug", event, fields),
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};

export function createRequestContext(headers?: Headers) {
  return {
    requestId: headers?.get("x-request-id")?.trim() || randomUUID(),
  };
}
