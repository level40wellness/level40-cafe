import "server-only";
import type { ZodError } from "zod";

/**
 * One shape for every admin mutation, so the client components can share a
 * single form harness.
 *
 * `fieldErrors` is kept separate from `error` because the source app funnelled
 * every failure through a toast — including validation — and a toast cannot
 * point at the field that was wrong, nor survive long enough to be re-read.
 */
export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const idle: ActionResult = { ok: true, message: "" };

export function fromZodError(error: ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    // First issue per field wins; later ones are usually downstream noise.
    fieldErrors[key] ??= issue.message;
  }

  return { ok: false, error: "Please correct the highlighted fields.", fieldErrors };
}

/**
 * Turns a guard rejection into a message, and anything else into a generic one.
 *
 * Unexpected errors are logged rather than shown: a raw driver message can
 * carry column names, constraint names and fragments of SQL, and this console
 * is reachable by any staff member with the admin role.
 */
export function fromUnknownError(error: unknown, fallback: string): ActionResult {
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return { ok: false, error: "Your session expired. Sign in again." };
    }
    if (error.message === "FORBIDDEN") {
      return { ok: false, error: "You do not have permission to do that." };
    }
  }

  console.error(fallback, error);
  return { ok: false, error: fallback };
}
