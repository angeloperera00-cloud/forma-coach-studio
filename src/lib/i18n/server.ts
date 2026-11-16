import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createI18n, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type I18n, type Locale } from "./core";

/** Locale of the current request (cookie), Italian by default. Memoized per request. */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const value = (await cookies()).get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
});

export const getI18n = cache(async (): Promise<I18n> => createI18n(await getLocale()));
