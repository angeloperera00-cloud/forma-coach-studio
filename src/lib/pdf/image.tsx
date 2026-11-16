import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import React from "react";
import { ImageResponse } from "next/og";
import type { MealEntry } from "@/lib/domain/types";
import {
  MEAL_SLOTS,
  MEAL_SLOT_LABELS,
  MUSCLE_LABELS,
  NUTRITION_STATUS_LABELS,
  WEEKDAY_LABELS,
  WORKOUT_STATUS_LABELS,
  type MuscleGroup,
} from "@/lib/domain/constants";
import { formatRest, planStats, sortDays, supersetInfo } from "@/lib/domain/workout";
import { cellEntries, daySummary, weeklyAverage } from "@/lib/domain/nutrition";
import { C, loadImage, type PdfImage } from "./shared";
import type { NutritionExport, WorkoutExport } from "./requests";

/* Share-friendly images (PNG/JPG) of a plan, rendered with next/og (Satori). */

export type ImageFormat = "png" | "jpg";
const WIDTH = 1080;

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" }[]> | null = null;
function loadFonts() {
  fonts ??= (async () => {
    const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
    const read = async (file: string) => {
      const b = await fs.readFile(path.join(dir, file));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    };
    return [
      { name: "Inter", data: await read("Inter_400Regular.ttf"), weight: 400 as const, style: "normal" as const },
      { name: "Inter", data: await read("Inter_600SemiBold.ttf"), weight: 600 as const, style: "normal" as const },
      { name: "Inter", data: await read("Inter_700Bold.ttf"), weight: 700 as const, style: "normal" as const },
    ];
  })();
  return fonts;
}

const dataUri = (img: PdfImage | null | undefined) => (img ? `data:image/${img.format === "jpg" ? "jpeg" : "png"};base64,${img.data.toString("base64")}` : null);

/** Renders at a generous height, then trims the empty bottom and encodes to PNG or JPG. */
async function encode(node: React.ReactElement, estimatedHeight: number, format: ImageFormat): Promise<Buffer> {
  const height = Math.min(16000, Math.max(800, Math.round(estimatedHeight * 1.35 + 300)));
  const res = new ImageResponse(node, { width: WIDTH, height, fonts: await loadFonts() });
  const png = Buffer.from(await res.arrayBuffer());
  const sharp = (await import("sharp")).default;
  const trimmed = await sharp(png).trim({ background: "#ffffff", threshold: 4 }).toBuffer();
  const out = sharp(trimmed).extend({ bottom: 48, background: "#ffffff" }).flatten({ background: "#ffffff" });
  return format === "jpg" ? out.jpeg({ quality: 90, mozjpeg: true }).toBuffer() : out.png({ compressionLevel: 9 }).toBuffer();
}

function Header({ kind, title, client, coach, studio, status }: { kind: string; title: string; client: string; coach: string; studio: string; status: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", backgroundColor: C.forest, padding: "44px 56px 40px", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: "#FFFFFF", fontSize: 26, fontWeight: 700 }}>{studio}</div>
          <div style={{ display: "flex", color: "#B9D3C4", fontSize: 18 }}>{coach}</div>
        </div>
        <div style={{ display: "flex", color: C.forest, backgroundColor: "#8FD19E", borderRadius: 999, padding: "6px 16px", fontSize: 17, fontWeight: 600 }}>{status}</div>
      </div>
      <div style={{ display: "flex", color: "#8FD19E", fontSize: 17, fontWeight: 600, letterSpacing: 2, marginTop: 34 }}>{kind.toUpperCase()}</div>
      <div style={{ display: "flex", color: "#FFFFFF", fontSize: 48, fontWeight: 700, marginTop: 6, lineHeight: 1.1 }}>{title}</div>
      <div style={{ display: "flex", color: "#DDEBD9", fontSize: 21, marginTop: 12 }}>{client}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexBasis: 0, backgroundColor: C.pale, borderRadius: 18, padding: "16px 20px" }}>
      <div style={{ display: "flex", color: C.muted, fontSize: 17 }}>{label}</div>
      <div style={{ display: "flex", color: C.text, fontSize: 30, fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Footer({ text }: { text: string }) {
  return <div style={{ display: "flex", color: C.muted, fontSize: 16, padding: "28px 56px 0", width: "100%" }}>{text}</div>;
}

/* ------------------------------------ workout ------------------------------------ */
export async function renderWorkoutImage({ plan, clientName, coach, exercises, i18n }: WorkoutExport, format: ImageFormat) {
  const { t, tn, fmt } = i18n;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const days = sortDays(plan.days).filter((d) => d.exercises.length > 0);
  const used = [...new Set(days.flatMap((d) => d.exercises.map((x) => x.exerciseId)))];
  const thumbs = new Map(await Promise.all(used.map(async (id) => [id, dataUri(await loadImage(byId.get(id)?.imageUrls[0]))] as const)));
  const stats = planStats(plan, byId);

  const node = (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#FFFFFF", fontFamily: "Inter" }}>
      <Header
        kind={t("Scheda di allenamento")}
        title={plan.name}
        client={`${t("Cliente")}: ${clientName ?? t("Senza cliente")}`}
        coach={coach.fullName}
        studio={coach.studioName || "Forma"}
        status={t(WORKOUT_STATUS_LABELS[plan.status])}
      />
      <div style={{ display: "flex", flexDirection: "column", padding: "32px 56px 0" }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Stat label={t("Giorni di allenamento")} value={String(stats.days)} />
          <Stat label={t("Esercizi")} value={String(stats.exerciseCount)} />
          <Stat label={t("Serie totali")} value={String(stats.totalSets)} />
          <Stat label={t("Minuti a settimana")} value={`≈ ${fmt.number(stats.weeklyMinutes)}`} />
        </div>
        {plan.notes && <div style={{ display: "flex", marginTop: 20, backgroundColor: C.tile, borderRadius: 16, padding: "16px 20px", fontSize: 19, color: C.text, lineHeight: 1.45 }}>{plan.notes}</div>}

        {days.map((day) => {
          const ss = supersetInfo(day.exercises);
          return (
            <div key={day.id} style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `3px solid ${C.forest}`, paddingBottom: 10 }}>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: C.forest }}>
                  {day.title ? `${t(WEEKDAY_LABELS[day.weekday])} — ${day.title}` : t(WEEKDAY_LABELS[day.weekday])}
                </div>
                <div style={{ display: "flex", fontSize: 17, color: C.muted }}>{tn("{n} esercizio", "{n} esercizi", day.exercises.length)}</div>
              </div>
              {day.notes && <div style={{ display: "flex", fontSize: 17, color: C.muted, marginTop: 10, lineHeight: 1.4 }}>{day.notes}</div>}
              {day.exercises.map((x, i) => {
                const ex = byId.get(x.exerciseId);
                const thumb = thumbs.get(x.exerciseId);
                const info = ss.get(x.id);
                const chips = [`${x.sets} × ${x.reps}`, `${t("Recupero")} ${formatRest(x.restSeconds)}`, x.weightKg !== null ? `${fmt.number(x.weightKg, 1)} kg` : null, x.tempo ? `${t("Tempo")} ${x.tempo}` : null].filter(
                  (c): c is string => Boolean(c),
                );
                return (
                  <div key={x.id} style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", width: 34, fontSize: 22, fontWeight: 700, color: info ? C.primary : C.muted }}>{info ? `${info.label}${info.index}` : String(i + 1)}</div>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
                      <img src={thumb} width={104} height={70} style={{ borderRadius: 12, objectFit: "cover" }} alt="" />
                    ) : (
                      <div style={{ display: "flex", width: 104, height: 70, borderRadius: 12, backgroundColor: C.tile }} />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", fontSize: 23, fontWeight: 600, color: C.text }}>{ex?.name ?? t("Esercizio rimosso dalla libreria")}</div>
                      {ex && <div style={{ display: "flex", fontSize: 16, color: C.muted, marginTop: 2 }}>{ex.primaryMuscles.map((m) => t(MUSCLE_LABELS[m as MuscleGroup] ?? m)).join(", ")}</div>}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                        {chips.map((c, k) => (
                          <div key={k} style={{ display: "flex", fontSize: 17, fontWeight: 600, color: k === 0 ? "#FFFFFF" : C.forest, backgroundColor: k === 0 ? C.primary : C.pale, borderRadius: 999, padding: "4px 12px" }}>
                            {c}
                          </div>
                        ))}
                      </div>
                      {x.notes && <div style={{ display: "flex", fontSize: 16, color: C.text, marginTop: 6 }}>{x.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {days.length === 0 && <div style={{ display: "flex", marginTop: 30, fontSize: 20, color: C.muted }}>{t("Nessun allenamento in questa scheda.")}</div>}
      </div>
      <Footer text={coach.pdfFooter || "Forma · Coach Studio"} />
    </div>
  );

  const rows = days.reduce((n, d) => n + d.exercises.length, 0);
  const notes = days.reduce((n, d) => n + d.exercises.filter((x) => x.notes).length + (d.notes ? 1 : 0), 0);
  return encode(node, 420 + (plan.notes ? 120 : 0) + days.length * 80 + rows * 112 + notes * 30, format);
}

/* ----------------------------------- nutrition ----------------------------------- */
export async function renderNutritionImage({ plan, clientName, coach, i18n }: NutritionExport, format: ImageFormat) {
  const { t, fmt } = i18n;
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => plan.meals.some((m) => m.day === d));
  const urls = [...new Set(plan.meals.map((m) => m.imageUrl).filter((u): u is string => Boolean(u)))];
  const icons = new Map(await Promise.all(urls.map(async (u) => [u, dataUri(await loadImage(u))] as const)));
  const avg = weeklyAverage(plan.meals);
  const [P, Cb, G] = [t("macro|P"), t("macro|C"), t("macro|G")];
  const amount = (m: MealEntry) => (m.amount !== null && m.unit ? ` · ${fmt.number(m.amount, 1)} ${m.unit}` : "");

  const node = (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", backgroundColor: "#FFFFFF", fontFamily: "Inter" }}>
      <Header
        kind={t("Piano alimentare")}
        title={plan.name}
        client={`${t("Cliente")}: ${clientName ?? t("Senza cliente")}`}
        coach={coach.fullName}
        studio={coach.studioName || "Forma"}
        status={t(NUTRITION_STATUS_LABELS[plan.status])}
      />
      <div style={{ display: "flex", flexDirection: "column", padding: "32px 56px 0" }}>
        <div style={{ display: "flex", gap: 14 }}>
          <Stat label={t("Media giornaliera")} value={avg ? `${fmt.number(avg.kcal)} kcal` : "—"} />
          <Stat label={t("Proteine")} value={avg ? `${fmt.number(avg.protein)} g` : "—"} />
          <Stat label={t("Carboidrati")} value={avg ? `${fmt.number(avg.carbs)} g` : "—"} />
          <Stat label={t("Grassi")} value={avg ? `${fmt.number(avg.fat)} g` : "—"} />
        </div>
        {plan.notes && <div style={{ display: "flex", marginTop: 20, backgroundColor: C.tile, borderRadius: 16, padding: "16px 20px", fontSize: 19, color: C.text, lineHeight: 1.45 }}>{plan.notes}</div>}

        {days.map((d) => {
          const s = daySummary(plan.meals, d);
          return (
            <div key={d} style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `3px solid ${C.forest}`, paddingBottom: 10 }}>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: C.forest }}>{t(WEEKDAY_LABELS[d])}</div>
                <div style={{ display: "flex", fontSize: 17, color: C.muted }}>
                  {s.entries > s.unknown ? `${fmt.number(s.kcal)} kcal · ${P} ${fmt.number(s.protein)} · ${Cb} ${fmt.number(s.carbs)} · ${G} ${fmt.number(s.fat)}` : t("valori n/d")}
                </div>
              </div>
              {MEAL_SLOTS.map((slot) => {
                const entries = cellEntries(plan.meals, d, slot);
                if (!entries.length) return null;
                return (
                  <div key={slot} style={{ display: "flex", gap: 18, padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", width: 190, fontSize: 19, fontWeight: 600, color: C.primary, paddingTop: 6 }}>{t(MEAL_SLOT_LABELS[slot])}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
                      {entries.map((m) => {
                        const icon = m.imageUrl ? icons.get(m.imageUrl) : null;
                        return (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {icon ? (
                              // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
                              <img src={icon} width={38} height={38} style={{ objectFit: "contain" }} alt="" />
                            ) : (
                              <div style={{ display: "flex", width: 38, height: 38, borderRadius: 10, backgroundColor: C.tile }} />
                            )}
                            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", fontSize: 21, fontWeight: 600, color: C.text }}>{`${m.name}${amount(m)}`}</div>
                              {m.notes && <div style={{ display: "flex", fontSize: 16, color: C.muted }}>{m.notes}</div>}
                            </div>
                            <div style={{ display: "flex", fontSize: 17, color: C.muted }}>{m.kcal !== null ? `${fmt.number(m.kcal)} kcal` : t("kcal n/d")}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {days.length === 0 && <div style={{ display: "flex", marginTop: 30, fontSize: 20, color: C.muted }}>{t("Nessun pasto in questo piano.")}</div>}
      </div>
      <Footer text={coach.pdfFooter || "Forma · Coach Studio"} />
    </div>
  );

  const slots = days.reduce((n, d) => n + MEAL_SLOTS.filter((s) => cellEntries(plan.meals, d, s).length).length, 0);
  return encode(node, 420 + (plan.notes ? 120 : 0) + days.length * 80 + slots * 40 + plan.meals.length * 56, format);
}
