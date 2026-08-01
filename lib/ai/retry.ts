export interface RetryOptions<T> {
  fn: () => Promise<T>;
  maxAttempts?: number;
  baseDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function defaultShouldRetry(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();
  if (
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("quota") ||
    message.includes("timeout") ||
    message.includes("temporar") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("econnreset") ||
    message.includes("fetch failed")
  ) {
    return true;
  }

  return false;
}

export async function withRetry<T>(options: RetryOptions<T>): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = Math.max(50, options.baseDelayMs ?? 500);
  const shouldRetry = options.shouldRetry ?? ((error) => defaultShouldRetry(error));

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await options.fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}
