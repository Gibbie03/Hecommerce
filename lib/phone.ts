// Phone number handling for the country-code + local-number input.
// Structured per-country so a future country picker only needs a new
// entry here, not a redesign of the input component.

export type CountryCode = {
  /** ISO 3166-1 alpha-2 */
  iso: "NG";
  /** Dialing code, without the leading + */
  dialCode: string;
  flag: string;
  label: string;
  /** National significant number length (after stripping a leading trunk 0) */
  nsnLength: number;
  /** Leading digits a mobile NSN must start with */
  mobilePrefixes: string[];
};

export const NIGERIA: CountryCode = {
  iso: "NG",
  dialCode: "234",
  flag: "🇳🇬",
  label: "Nigeria",
  nsnLength: 10,
  mobilePrefixes: ["70", "71", "72", "80", "81", "90", "91"],
};

export const DEFAULT_COUNTRY = NIGERIA;

/** Strips everything but digits. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalizes a user-entered local number into the country's national
 * significant number (no leading 0, no dial code, digits only).
 */
export function toNationalNumber(rawLocal: string, country: CountryCode = DEFAULT_COUNTRY): string {
  let digits = digitsOnly(rawLocal);
  // A user typing the full number with dial code into the local field
  // (e.g. pasting "2348011112222") — strip the dial code so it isn't
  // double-applied downstream.
  if (digits.startsWith(country.dialCode) && digits.length > country.nsnLength) {
    digits = digits.slice(country.dialCode.length);
  }
  // Domestic trunk prefix: drop exactly one leading 0.
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

/** Combines a country + raw local input into E.164, e.g. +2348011112222. */
export function toE164(rawLocal: string, country: CountryCode = DEFAULT_COUNTRY): string {
  const national = toNationalNumber(rawLocal, country);
  return `+${country.dialCode}${national}`;
}

export type PhoneValidation = { valid: true } | { valid: false; message: string };

/** Validates a raw local-number input against the country's mobile rules. */
export function validateLocalNumber(rawLocal: string, country: CountryCode = DEFAULT_COUNTRY): PhoneValidation {
  const national = toNationalNumber(rawLocal, country);
  if (!national) {
    return { valid: false, message: "Enter your phone number." };
  }
  if (!/^\d+$/.test(national)) {
    return { valid: false, message: "Phone numbers can only contain digits." };
  }
  if (national.length !== country.nsnLength) {
    return { valid: false, message: `Enter a ${country.nsnLength}-digit ${country.label} number.` };
  }
  const hasValidPrefix = country.mobilePrefixes.some((prefix) => national.startsWith(prefix));
  if (!hasValidPrefix) {
    return { valid: false, message: "Enter a valid Nigerian mobile number." };
  }
  return { valid: true };
}

/** True if `value` is already a full E.164 number (e.g. pasted from elsewhere). */
export function isE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value.trim());
}

/**
 * Splits a stored E.164 number back into a displayable local part for the
 * given country, for prefilling the input (e.g. from a business record).
 * Returns the raw value unchanged if it doesn't match the country's dial code.
 */
export function e164ToLocalDisplay(value: string, country: CountryCode = DEFAULT_COUNTRY): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith(`+${country.dialCode}`)) return trimmed.replace(/^\+/, "");
  return trimmed.slice(country.dialCode.length + 1);
}
