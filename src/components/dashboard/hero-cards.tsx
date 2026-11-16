"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Dumbbell, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

export function HeroActionCards({ clientId, className }: { clientId: string | null; className?: string }) {
  const { t } = useI18n();
  const q = clientId ? `?client=${clientId}` : "";
  return (
    <section aria-label={t("Crea")} className={cn("grid gap-4 md:gap-5 lg:grid-cols-2", className)}>
      <Link
        href={`/workouts/new${q}`}
        className="group relative isolate flex min-h-[236px] overflow-hidden rounded-3xl bg-forest text-white shadow-card outline-none transition-[transform,box-shadow] duration-200 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:shadow-raised focus-visible:ring-[3px] focus-visible:ring-ring/40 md:min-h-[256px]"
      >
        <div className="absolute inset-y-0 right-0 -z-10 w-[62%] overflow-hidden sm:w-[56%]">
          <Image
            src="/brand/hero-workout.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 30vw, 60vw"
            className="object-cover object-[70%_40%] transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/55 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest/50 to-transparent" />
        </div>
        <div className="absolute inset-0 -z-20 bg-forest bg-[radial-gradient(70%_90%_at_0%_0%,#1d5843_0%,transparent_70%)]" />
        <div className="flex w-full flex-col justify-between gap-6 p-6 md:p-7">
          <span className="grid size-14 place-items-center rounded-full bg-[#2b7357] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
            <Dumbbell className="size-6" />
          </span>
          <div className="max-w-[62%] sm:max-w-[55%]">
            <h3 className="text-[25px] leading-[1.12] font-bold tracking-[-0.015em] md:text-[29px]">{t("Crea Scheda di Allenamento")}</h3>
            <p className="mt-2 text-[14.5px] leading-snug text-white/78 md:text-[15px]">{t("Inserisci esercizi, serie, ripetizioni e recupero.")}</p>
          </div>
        </div>
        <span className="absolute right-6 bottom-6 grid size-14 place-items-center rounded-full bg-white text-forest shadow-raised transition-transform duration-200 ease-[var(--ease-soft)] group-hover:translate-x-1 md:right-7 md:bottom-7">
          <ArrowRight className="size-6" />
        </span>
      </Link>

      <Link
        href={`/nutrition/new${q}`}
        className="group relative isolate flex min-h-[236px] overflow-hidden rounded-3xl border bg-[#eef3ec] shadow-card outline-none transition-[transform,box-shadow] duration-200 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:shadow-raised focus-visible:ring-[3px] focus-visible:ring-ring/40 md:min-h-[256px]"
      >
        <div className="absolute top-0 right-0 bottom-0 -z-10 w-[58%] overflow-hidden sm:w-[52%]">
          <Image
            src="/brand/hero-nutrition.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 28vw, 58vw"
            className="object-cover object-[30%_45%] transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#eef3ec] via-[#eef3ec]/25 to-transparent" />
        </div>
        <div className="flex w-full flex-col justify-between gap-6 p-6 md:p-7">
          <span className="grid size-14 place-items-center rounded-full bg-card text-primary shadow-card">
            <UtensilsCrossed className="size-6" />
          </span>
          <div className="max-w-[60%] sm:max-w-[54%]">
            <h3 className="text-[25px] leading-[1.12] font-bold tracking-[-0.015em] text-foreground md:text-[29px]">{t("Crea Piano Alimentare")}</h3>
            <p className="mt-2 text-[14.5px] leading-snug text-muted-foreground md:text-[15px]">{t("Organizza i pasti della settimana in modo semplice.")}</p>
          </div>
        </div>
        <span className="absolute right-6 bottom-6 grid size-14 place-items-center rounded-full bg-primary text-white shadow-raised transition-[transform,background-color] duration-200 ease-[var(--ease-soft)] group-hover:translate-x-1 group-hover:bg-primary-hover md:right-7 md:bottom-7">
          <ArrowRight className="size-6" />
        </span>
      </Link>
    </section>
  );
}
