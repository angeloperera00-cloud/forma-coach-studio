"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { setLocaleAction } from "@/lib/actions/auth";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";

/** IT / EN toggle. Italian is the default; the choice is stored in a cookie. */
export function LanguageSwitcher({ locale, className }: { locale: Locale; className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <div role="group" aria-label="Lingua / Language" className={cn("inline-flex items-center gap-1 rounded-xl bg-muted p-1", pending && "opacity-60", className)}>
      <Languages className="mx-1 size-4 text-muted-foreground" aria-hidden />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          title={LOCALE_NAMES[l]}
          onClick={() =>
            startTransition(async () => {
              await setLocaleAction(l);
              router.refresh();
            })
          }
          className={cn(
            "h-7 rounded-lg px-2.5 text-[12.5px] font-semibold uppercase transition-colors",
            l === locale ? "bg-card text-forest shadow-[0_1px_3px_rgb(18_62_48/0.1)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
