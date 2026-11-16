/** Normalizes phone numbers to E.164; Italian numbers may be typed without +39. */
export function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s\-().]/g, "");
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  if (!p.startsWith("+")) p = `+39${p}`;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}
