import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normalize an arbitrary phone string to E.164, defaulting to Bangladesh (+880).
 *
 * Handles the common local-input shapes:
 *   01712345678      -> +8801712345678
 *   1712345678       -> +8801712345678
 *   +8801712345678   -> +8801712345678
 *   8801712345678    -> +8801712345678
 *   0088 01712345678 -> +8801712345678
 *
 * Returns null when the input cannot be resolved to a valid number.
 */
export function normalizePhone(
  input: string | null | undefined,
  defaultCountry: "BD" = "BD"
): string | null {
  if (!input) return null;

  let raw = String(input).trim();
  if (!raw) return null;

  // Strip common separators but keep a leading +.
  raw = raw.replace(/[\s\-().]/g, "");

  // Convert international prefix "00" to "+".
  if (raw.startsWith("00")) {
    raw = "+" + raw.slice(2);
  }

  // Bare "880..." (no plus) -> add plus.
  if (!raw.startsWith("+") && raw.startsWith("880")) {
    raw = "+" + raw;
  }

  // Local "01XXXXXXXXX" (11 digits) -> +880 1XXXXXXXXX.
  if (!raw.startsWith("+") && /^0\d{10}$/.test(raw)) {
    raw = "+880" + raw.slice(1);
  }

  // Local without leading zero "1XXXXXXXXX" (10 digits) -> +880 ...
  if (!raw.startsWith("+") && /^1\d{9}$/.test(raw)) {
    raw = "+880" + raw;
  }

  const parsed = parsePhoneNumberFromString(raw, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;

  return parsed.number; // E.164, e.g. +8801712345678
}

/** True when `input` normalizes to a valid E.164 number. */
export function isValidPhone(input: string | null | undefined): boolean {
  return normalizePhone(input) !== null;
}

/** Build a click-to-chat wa.me link from a phone (any format). */
export function whatsappLink(phone: string, text?: string): string | null {
  const e164 = normalizePhone(phone);
  if (!e164) return null;
  const digits = e164.replace(/^\+/, "");
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
