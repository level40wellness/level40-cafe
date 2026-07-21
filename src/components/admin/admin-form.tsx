"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { ActionResult } from "@/server/actions/admin/result";

export type AdminAction = (
  prev: ActionResult,
  formData: FormData,
) => Promise<ActionResult>;

const IDLE: ActionResult = { ok: true, message: "" };

/**
 * Drives an admin mutation from a form.
 *
 * Deliberately not useActionState: the success path has to close a modal and
 * refresh the server data, and reacting to a returned state means setting
 * state from an effect — which the React Compiler lint rejects, and rightly,
 * because it renders the stale result once before correcting itself. Awaiting
 * the action here keeps it a straight line.
 */
export function useAdminAction(
  action: AdminAction,
  { onSuccess }: { onSuccess?: () => void } = {},
) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult>(IDLE);

  async function submit(formData: FormData) {
    setPending(true);

    try {
      const next = await action(IDLE, formData);
      setResult(next);

      if (next.ok) {
        if (next.message) toast.success(next.message);
        onSuccess?.();
        // The list is rendered by a server component; without this the row
        // just saved would keep showing its previous values.
        router.refresh();
      } else {
        toast.error(next.error);
      }
    } catch (error) {
      // A thrown action means the request never completed — a redeploy
      // mid-submit, or the network dropping.
      const message =
        error instanceof Error ? error.message : "The request did not complete.";
      setResult({ ok: false, error: message });
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  const fieldErrors = result.ok ? undefined : result.fieldErrors;

  return {
    submit,
    pending,
    fieldErrors,
    formError: result.ok ? undefined : result.error,
  };
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span className="a-error" role="alert">
      {message}
    </span>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="a-error-summary" role="alert">
      {message}
    </p>
  );
}

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="a-field">
      <label className="a-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}
