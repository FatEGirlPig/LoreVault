"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

type Action = (s: FormState, f: FormData) => Promise<FormState>;

export function Submit({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className}>{pending ? "Working…" : children}</button>;
}

/** Form bound to a server action that returns {error|message}. */
export function ActionForm({ action, children, className = "space-y-4" }: { action: Action; children: React.ReactNode; className?: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state?.message && <p role="status" className="text-sm text-cyan">{state.message}</p>}
    </form>
  );
}

/** Select that submits its parent form on change (for inline visibility toggles). */
export function AutoSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="input" onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

export function ConfirmButton({ children, message, className = "btn-danger" }: { children: React.ReactNode; message: string; className?: string }) {
  return <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}
