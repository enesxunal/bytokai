type LogLevel = "info" | "warn" | "error";

type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | LogValue[]
  | { [key: string]: LogValue };

const SECRET_KEY_PATTERN =
  /(password|secret|token|api[_-]?key|authorization|cookie|service[_-]?role|private[_-]?key|credential)/i;

function redactValue(key: string, value: LogValue): LogValue {
  if (SECRET_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(String(index), item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, LogValue> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      result[childKey] = redactValue(childKey, childValue);
    }
    return result;
  }

  return value;
}

function sanitizeMeta(
  meta?: Record<string, LogValue>,
): Record<string, LogValue> | undefined {
  if (!meta) {
    return undefined;
  }

  const sanitized: Record<string, LogValue> = {};
  for (const [key, value] of Object.entries(meta)) {
    sanitized[key] = redactValue(key, value);
  }
  return sanitized;
}

function writeLog(
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, LogValue>,
): void {
  const entry = {
    level,
    scope,
    message,
    timestamp: new Date().toISOString(),
    ...(sanitizeMeta(meta) ? { meta: sanitizeMeta(meta) } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export interface Logger {
  info: (message: string, meta?: Record<string, LogValue>) => void;
  warn: (message: string, meta?: Record<string, LogValue>) => void;
  error: (message: string, meta?: Record<string, LogValue>) => void;
  child: (childScope: string) => Logger;
}

export function createLogger(scope: string): Logger {
  return {
    info(message, meta) {
      writeLog("info", scope, message, meta);
    },
    warn(message, meta) {
      writeLog("warn", scope, message, meta);
    },
    error(message, meta) {
      writeLog("error", scope, message, meta);
    },
    child(childScope) {
      return createLogger(`${scope}:${childScope}`);
    },
  };
}
