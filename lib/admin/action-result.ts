import { ZodError } from "zod";
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  isAppError,
} from "@/lib/utils/errors";

export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export function okResult<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

export function failResult(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!fieldErrors[key]) {
      fieldErrors[key] = [];
    }
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    return failResult("Form doğrulaması başarısız", zodFieldErrors(error));
  }

  if (error instanceof AuthenticationError) {
    return failResult(error.message);
  }

  if (error instanceof AuthorizationError) {
    return failResult(error.message);
  }

  if (error instanceof ValidationError) {
    return failResult(error.message);
  }

  if (isAppError(error)) {
    return failResult(error.message);
  }

  if (error instanceof Error) {
    return failResult(error.message || "Beklenmeyen bir hata oluştu");
  }

  return failResult("Beklenmeyen bir hata oluştu");
}
