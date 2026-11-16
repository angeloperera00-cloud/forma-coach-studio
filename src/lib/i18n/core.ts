/**
 * Lightweight gettext-style i18n.
 * Italian is the source language: components call t("Testo italiano") and the English
 * catalogue maps each Italian source string to its translation. Missing entries fall back
 * to Italian. `npm run i18n:check` lists any string without an English translation.
 */
import { EN } from "./en";
import { formatInstant, formatDayKey, formatRelative, formatDateTime, intlLocale } from "@/lib/datetime";

export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";
export const LOCALE_COOKIE = "forma-locale";
export const LOCALE_NAMES: Record<Locale, string> = { it: "Italiano", en: "English" };

export type Params = Record<string, string | number | null | undefined>;

/**
 * Marks an Italian string for translation where t() is not available yet
 * (server-side errors, validation messages). It is translated when shown.
 */
export const msg = (source: string) => source;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function interpolate(template: string, params?: Params | null): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (params[key] === undefined || params[key] === null ? match : String(params[key])));
}

export interface Translator {
  locale: Locale;
  /** Translate an Italian source string, with optional {placeholders}. */
  t: (source: string, params?: Params | null) => string;
  /** Plural helper: tn("{n} esercizio", "{n} esercizi", count) */
  tn: (one: string, other: string, count: number, params?: Params) => string;
  /** True if the string has a translation in the active locale (always true for Italian). */
  has: (source: string) => boolean;
}

/**
 * Encodes a template + params in a single string, for places that only carry plain strings
 * (e.g. zod validation messages). t() decodes it; string params are translated too.
 */
const ENCODED = "§i18n:";
export const msgp = (template: string, params: Params) => ENCODED + JSON.stringify([template, params]);
function decode(source: string): [string, Params] | null {
  if (!source.startsWith(ENCODED)) return null;
  try {
    const [template, params] = JSON.parse(source.slice(ENCODED.length)) as [string, Params];
    return typeof template === "string" ? [template, params ?? {}] : null;
  } catch {
    return null;
  }
}

export function createTranslator(locale: Locale): Translator {
  const catalogue = locale === "en" ? EN : null;
  // "context|Testo" disambiguates identical Italian words with different meanings.
  const strip = (source: string) => (/^[a-z]+\|/.test(source) ? source.slice(source.indexOf("|") + 1) : source);
  const lookup = (source: string) => (catalogue ? (catalogue[source] ?? strip(source)) : strip(source));
  const t: Translator["t"] = (source, params) => {
    const encoded = decode(source);
    if (encoded) {
      const [template, inner] = encoded;
      const translated = Object.fromEntries(Object.entries(inner).map(([k, v]) => [k, typeof v === "string" ? lookup(v) : v]));
      return interpolate(lookup(template), { ...translated, ...params });
    }
    return interpolate(lookup(source), params);
  };
  return {
    locale,
    t,
    tn: (one, other, count, params) => interpolate(lookup(count === 1 ? one : other), { n: count, ...params }),
    has: (source) => !catalogue || source in catalogue || (decode(source)?.[0] ?? "") in catalogue,
  };
}

/* ---------------------------------- formatting --------------------------------- */
export interface Formatter {
  number: (value: number | null | undefined, digits?: 0 | 1 | 2) => string;
  signed: (value: number, digits?: 0 | 1) => string;
  dayKey: (key: string, opts?: Intl.DateTimeFormatOptions, capitalize?: boolean) => string;
  instant: (value: Date | string, opts: Intl.DateTimeFormatOptions, capitalize?: boolean) => string;
  dateTime: (value: Date | string) => string;
  relative: (value: Date | string, now?: Date) => string;
}

export function createFormatter(locale: Locale): Formatter {
  const tag = intlLocale(locale);
  const nf = [0, 1, 2].map((d) => new Intl.NumberFormat(tag, { maximumFractionDigits: d }));
  const number: Formatter["number"] = (value, digits = 0) =>
    value === null || value === undefined || Number.isNaN(value) ? "—" : nf[digits].format(value);
  return {
    number,
    signed: (value, digits = 1) => {
      const s = number(Math.abs(value), digits);
      return value > 0 ? `+${s}` : value < 0 ? `−${s}` : s;
    },
    dayKey: (key, opts, cap) => formatDayKey(key, opts, cap, locale),
    instant: (value, opts, cap) => formatInstant(value, opts, cap, locale),
    dateTime: (value) => formatDateTime(value, locale),
    relative: (value, now) => formatRelative(value, now, locale),
  };
}

export interface I18n extends Translator {
  fmt: Formatter;
}

export function createI18n(locale: Locale): I18n {
  return { ...createTranslator(locale), fmt: createFormatter(locale) };
}
