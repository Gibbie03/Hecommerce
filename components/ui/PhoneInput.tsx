"use client";

import { useState } from "react";
import {
  DEFAULT_COUNTRY,
  toE164,
  validateLocalNumber,
  e164ToLocalDisplay,
  type CountryCode,
} from "@/lib/phone";

const FIELD_CLASSES =
  "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 disabled:bg-paper-dim disabled:text-muted";

export function PhoneInput({
  label = "Phone number",
  value,
  onChange,
  country = DEFAULT_COUNTRY,
  required,
  disabled,
  id,
}: {
  label?: string;
  /** Stored/authenticated value, always E.164 (e.g. +2348011112222). */
  value: string;
  onChange: (e164: string) => void;
  country?: CountryCode;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const [local, setLocal] = useState(() => e164ToLocalDisplay(value, country));
  const [touched, setTouched] = useState(false);

  const validation = validateLocalNumber(local, country);
  const showError = touched && local.length > 0 && !validation.valid;

  function handleChange(next: string) {
    setLocal(next);
    const check = validateLocalNumber(next, country);
    onChange(check.valid ? toE164(next, country) : "");
  }

  return (
    <label className="block space-y-1.5" htmlFor={id}>
      {label && <span className="block text-sm font-medium text-ink">{label}</span>}
      <div className="flex gap-2">
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-paper-dim px-3 text-sm text-ink"
          aria-hidden="true"
        >
          <span>{country.flag}</span>
          <span>+{country.dialCode}</span>
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          disabled={disabled}
          placeholder="8011112222"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          className={FIELD_CLASSES}
        />
      </div>
      {showError ? (
        <span className="block text-xs text-danger">{!validation.valid && validation.message}</span>
      ) : (
        <span className="block text-xs text-muted">
          {country.label} mobile number, without the leading 0 — e.g. 8011112222
        </span>
      )}
    </label>
  );
}
