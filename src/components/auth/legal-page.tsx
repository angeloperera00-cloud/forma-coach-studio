import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Locale } from "@/lib/i18n/core";
import { AuthShell } from "./auth-shell";

export interface LegalText {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  back: string;
  note: string;
}

/** Simple legal page (Italian / English). The texts are a starting template: review them for your studio. */
export function LegalPage({ locale, text }: { locale: Locale; text: LegalText }) {
  return (
    <AuthShell locale={locale} wide>
      <Link href="/login" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-forest hover:underline">
        <ArrowLeft className="size-4" /> {text.back}
      </Link>
      <h1 className="text-[28px] font-bold tracking-tight">{text.title}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">{text.updated}</p>
      <p className="mt-5 text-[15px] leading-relaxed">{text.intro}</p>
      {text.sections.map((s) => (
        <section key={s.heading} className="mt-6">
          <h2 className="text-[17px] font-semibold text-forest">{s.heading}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-2 text-[14.5px] leading-relaxed text-foreground/85">
              {p}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-8 rounded-2xl bg-muted/70 px-4 py-3 text-[12.5px] text-muted-foreground">{text.note}</p>
    </AuthShell>
  );
}
