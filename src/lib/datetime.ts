/**
 * Time-zone safe date helpers. Every date shown to the coach is rendered in APP_TIMEZONE,
 * on the server and in the browser alike, so server-rendered times never drift (e.g. UTC on Vercel).
 * Calendar days are handled as "YYYY-MM-DD" keys.
 */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Europe/Rome";

type Lang = "it" | "en";
/** BCP-47 tag used for Intl formatting. English uses en-GB (day-first dates, 24h clock). */
export function intlLocale(lang: Lang = "it"): string {
  return lang === "en" ? "en-GB" : "it-IT";
}

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const pad = (n: number) => String(n).padStart(2, "0");

export function zonedParts(date: Date) {
  const p: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** "YYYY-MM-DD" of an instant, in the app time zone. */
export function dayKeyOf(value: Date | string): string {
  const p = zonedParts(new Date(value));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function todayKey(): string {
  return dayKeyOf(new Date());
}

/** "HH:mm" of an instant, in the app time zone. */
export function timeOf(value: Date | string): string {
  const p = zonedParts(new Date(value));
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Wall-clock date + time in the app time zone → UTC instant. DST safe. */
export function zonedToUtc(dayKey: string, time = "00:00"): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(guess));
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const diff = asUtc - target;
    if (diff === 0) break;
    guess -= diff;
  }
  return new Date(guess);
}

function keyToUtcNoon(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

export function addDaysToKey(key: string, days: number): string {
  const d = keyToUtcNoon(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayOfKey(key: string): number {
  return (keyToUtcNoon(key).getUTCDay() + 6) % 7;
}

export function startOfWeekKey(key: string): string {
  return addDaysToKey(key, -weekdayOfKey(key));
}

export function diffInDays(aKey: string, bKey: string): number {
  return Math.round((keyToUtcNoon(aKey).getTime() - keyToUtcNoon(bKey).getTime()) / 86_400_000);
}

export function monthGridKeys(year: number, month: number): string[] {
  const first = `${year}-${pad(month)}-01`;
  const start = startOfWeekKey(first);
  return Array.from({ length: 42 }, (_, i) => addDaysToKey(start, i));
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Format a calendar day key (no time-zone shift possible). */
export function formatDayKey(
  key: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
  cap = false,
  lang: Lang = "it",
): string {
  const s = new Intl.DateTimeFormat(intlLocale(lang), { ...opts, timeZone: "UTC" }).format(keyToUtcNoon(key));
  return cap ? capitalize(s) : s;
}

/** Format an instant in the app time zone. */
export function formatInstant(value: Date | string, opts: Intl.DateTimeFormatOptions, cap = false, lang: Lang = "it"): string {
  const s = new Intl.DateTimeFormat(intlLocale(lang), { ...opts, timeZone: APP_TIMEZONE }).format(new Date(value));
  return cap ? capitalize(s) : s;
}

export function formatDateTime(value: Date | string, lang: Lang = "it"): string {
  return formatInstant(value, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, false, lang);
}

const rtfCache: Partial<Record<Lang, Intl.RelativeTimeFormat>> = {};

/** "adesso" / "now", "5 minuti fa", "ieri", "tra 3 giorni" … */
export function formatRelative(value: Date | string, now: Date = new Date(), lang: Lang = "it"): string {
  const rtf = (rtfCache[lang] ??= new Intl.RelativeTimeFormat(intlLocale(lang), { numeric: "auto" }));
  const diffSec = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return lang === "en" ? "just now" : "adesso";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), "hour");
  const days = diffInDays(dayKeyOf(value), dayKeyOf(now));
  if (Math.abs(days) < 7) return rtf.format(days, "day");
  if (Math.abs(days) < 35) return rtf.format(Math.round(days / 7), "week");
  return formatInstant(value, { day: "numeric", month: "short", year: "numeric" }, false, lang);
}

export function ageFromBirthDate(birthKey: string | null, today = todayKey()): number | null {
  if (!birthKey) return null;
  const [by, bm, bd] = birthKey.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}
