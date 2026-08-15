import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from "react";

const FIELD_CLASSES =
  "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 disabled:bg-paper-dim disabled:text-muted";

export function Field({
  label,
  hint,
  children,
  ...rest
}: { label?: string; hint?: string; children: ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className="block space-y-1.5" {...rest}>
      {label && <span className="block text-sm font-medium text-ink">{label}</span>}
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASSES} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_CLASSES} min-h-24 resize-y ${className}`} {...rest} />;
}

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={`${FIELD_CLASSES} ${className}`} {...rest}>
      {children}
    </select>
  );
}
