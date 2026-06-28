// Attribution capture — pull UTM + click identifiers from an arbitrary payload.

export type Attribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  referrer: string | null;
};

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

/**
 * Extract attribution from a flat payload (form fields, query params, or a
 * nested `attribution`/`utm` object). Tolerant of snake_case and camelCase.
 */
export function extractAttribution(
  payload: Record<string, unknown> | null | undefined
): Attribution {
  const p: Record<string, unknown> = { ...(payload ?? {}) };

  // Merge a nested attribution / utm object if present.
  for (const nestKey of ["attribution", "utm", "tracking"]) {
    const nested = p[nestKey];
    if (nested && typeof nested === "object") {
      Object.assign(p, nested as Record<string, unknown>);
    }
  }

  return {
    utmSource: pick(p, ["utm_source", "utmSource"]),
    utmMedium: pick(p, ["utm_medium", "utmMedium"]),
    utmCampaign: pick(p, ["utm_campaign", "utmCampaign"]),
    utmContent: pick(p, ["utm_content", "utmContent"]),
    utmTerm: pick(p, ["utm_term", "utmTerm"]),
    fbclid: pick(p, ["fbclid", "fbc_lid"]),
    fbp: pick(p, ["fbp", "_fbp"]),
    fbc: pick(p, ["fbc", "_fbc"]),
    referrer: pick(p, ["referrer", "referer", "ref"]),
  };
}

/** Only the attribution keys that are non-null — for a non-destructive update. */
export function attributionToUpdate(
  attr: Attribution
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attr)) {
    if (v != null) out[k] = v;
  }
  return out;
}
