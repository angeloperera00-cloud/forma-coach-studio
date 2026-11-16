import Link from "next/link";
import type { Locale } from "@/lib/i18n/core";
import { BrandMark } from "@/components/shell/brand";
import { LanguageSwitcher } from "@/components/common/language-switcher";

/** Centered card layout shared by the auth pages (pending, reset password, legal). */
export function AuthShell({ locale, children, wide }: { locale: Locale; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgb(22_131_75/0.12),transparent_70%)]" />
      <header className="relative flex items-center justify-between px-5 py-5 sm:px-10">
        <Link href="/login" className="flex items-center gap-2.5" aria-label="Forma">
          <BrandMark size={36} />
          <span className="leading-tight">
            <span className="block text-[16px] font-semibold text-forest">Forma</span>
            <span className="block text-[12px] text-muted-foreground">Coach Studio</span>
          </span>
        </Link>
        <LanguageSwitcher locale={locale} />
      </header>
      <main className="relative flex flex-1 justify-center px-5 pt-6 pb-12 sm:items-center sm:pt-0">
        <section className={`w-full ${wide ? "max-w-[720px]" : "max-w-[460px]"} rounded-[28px] border bg-card/95 px-5 py-8 shadow-[0_24px_60px_-28px_rgb(18_62_48/0.35)] sm:px-9 sm:py-10`}>
          {children}
        </section>
      </main>
    </div>
  );
}
