"use client";

import * as React from "react";
import { createI18n, type I18n, type Locale } from "./core";

const I18nContext = React.createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = React.useMemo(() => createI18n(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** { t, tn, fmt, locale } for client components. */
export function useI18n(): I18n {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
