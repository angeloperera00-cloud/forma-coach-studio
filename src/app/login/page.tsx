import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarCheck2, Dumbbell, Salad, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { localCredentials, supabaseAuthConfig } from "@/lib/auth/config";
import { getI18n } from "@/lib/i18n/server";
import { BrandMark } from "@/components/shell/brand";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/common/language-switcher";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Accedi") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSession()) redirect("/");
  const [{ t, locale }, sp] = await Promise.all([getI18n(), searchParams]);
  const supabase = Boolean(supabaseAuthConfig());
  const local = supabase ? null : localCredentials();
  const demo = local?.isDemo ? local : null;
  const next = typeof sp.next === "string" ? sp.next : "/";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative isolate hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Image src="/brand/hero-workout.jpg" alt="" fill priority sizes="50vw" className="-z-10 object-cover object-[70%_center] opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-forest via-forest/85 to-forest/40" />
        <div className="flex items-center gap-3">
          <BrandMark size={40} />
          <div className="leading-tight">
            <div className="text-[18px] font-semibold">Forma</div>
            <div className="text-[13px] text-white/70">Coach Studio</div>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-[40px] leading-[1.08] font-bold tracking-[-0.02em] text-balance">{t("Il tuo studio di coaching, in un'unica app.")}</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-white/75">{t("Schede di allenamento, piani alimentari e progressi dei tuoi clienti in un unico studio.")}</p>
          <ul className="mt-8 flex flex-col gap-3.5 text-[15px] text-white/85">
            {[
              [Dumbbell, t("Schede con serie, ripetizioni e recupero")],
              [Salad, t("Piani alimentari settimanali con valori nutrizionali")],
              [CalendarCheck2, t("Appuntamenti, check-in e promemoria")],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Dumbbell;
              return (
                <li key={String(label)} className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/10">
                    <I className="size-[18px]" />
                  </span>
                  {String(label)}
                </li>
              );
            })}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-[13px] text-white/60">
          <ShieldCheck className="size-4" /> {t("Area riservata al coach: i clienti non hanno bisogno di un account.")}
        </p>
      </aside>

      <main className="relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:invisible">
            <BrandMark size={34} />
            <span className="text-[16px] font-semibold text-forest">Forma</span>
          </div>
          <LanguageSwitcher locale={locale} />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <h2 className="text-[30px] font-bold tracking-tight">{t("Bentornato, Coach")}</h2>
          <p className="mt-1.5 text-[15px] text-muted-foreground">{t("Accedi per gestire clienti, schede e piani alimentari.")}</p>
          <LoginForm next={next} demo={demo ? { email: demo.email, password: demo.password } : null} supabase={supabase} />
        </div>
        <p className="text-center text-[12.5px] text-muted-foreground">© {new Date().getFullYear()} Forma · Coach Studio</p>
      </main>
    </div>
  );
}
