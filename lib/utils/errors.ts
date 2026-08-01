export type ErrorCode =
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "VALIDATION_ERROR"
  | "SOURCE_FETCH_ERROR"
  | "AI_ERROR"
  | "PUBLISHING_ERROR"
  | "LOCK_ERROR";

export abstract class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): {
    name: string;
    code: ErrorCode;
    statusCode: number;
    message: string;
    details?: unknown;
  } {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
    };
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Kimlik doğrulama gerekli", details?: unknown) {
    super(message, "AUTHENTICATION_ERROR", 401, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Bu işlem için yetkiniz yok", details?: unknown) {
    super(message, "AUTHORIZATION_ERROR", 403, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Doğrulama hatası", details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}

export class SourceFetchError extends AppError {
  constructor(message = "Kaynak çekilemedi", details?: unknown) {
    super(message, "SOURCE_FETCH_ERROR", 502, details);
  }
}

export class AIError extends AppError {
  constructor(message = "AI işlem hatası", details?: unknown) {
    super(message, "AI_ERROR", 502, details);
  }
}

export class PublishingError extends AppError {
  constructor(message = "Yayınlama hatası", details?: unknown) {
    super(message, "PUBLISHING_ERROR", 500, details);
  }
}

export class LockError extends AppError {
  constructor(message = "Kilit alınamadı", details?: unknown) {
    super(message, "LOCK_ERROR", 423, details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
