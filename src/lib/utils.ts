import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nf0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

/** Italian number formatting: 1.234 · 62,8 */
export function formatNumber(value: number | null | undefined, digits: 0 | 1 | 2 = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return (digits === 0 ? nf0 : digits === 1 ? nf1 : nf2).format(value);
}

export function formatSigned(value: number, digits: 0 | 1 = 1): string {
  const s = formatNumber(Math.abs(value), digits);
  if (value > 0) return `+${s}`;
  if (value < 0) return `−${s}`;
  return s;
}

/** Accepts "62,5", "62.5", " 62 " → 62.5. Returns null for empty, NaN for invalid. */
export function parseDecimal(input: string): number | null {
  const v = input.trim().replace(/\s/g, "").replace(",", ".");
  if (v === "") return null;
  if (!/^-?\d*\.?\d+$/.test(v)) return Number.NaN;
  return Number(v);
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function initials(first: string, last?: string): string {
  const a = first.trim().charAt(0);
  const b = (last ?? "").trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

export function fullName(c: { firstName: string; lastName: string }): string {
  return `${c.firstName} ${c.lastName}`.trim();
}

export function pluralize(n: number, one: string, many: string): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

/** Case/accent-insensitive "contains" used by every search box. */
export function matches(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  return norm(haystack).includes(norm(needle.trim()));
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function groupBy<T, K extends string | number>(list: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of list) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}
