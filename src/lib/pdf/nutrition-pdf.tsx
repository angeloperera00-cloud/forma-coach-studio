import "server-only";
/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> is not an HTML img */
import React from "react";
import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CoachProfile, MealEntry, NutritionPlan } from "@/lib/domain/types";
import { MEAL_SLOTS, MEAL_SLOT_LABELS, NUTRITION_STATUS_LABELS, WEEKDAY_LABELS } from "@/lib/domain/constants";
import { cellEntries, daySummary, hasTargets, weeklyAverage } from "@/lib/domain/nutrition";
import { addDaysToKey } from "@/lib/datetime";
import type { I18n } from "@/lib/i18n/core";
import { C, DocFooter, DocHeader, Stat, base, loadImage, registerFonts, type PdfImage } from "./shared";

interface Input {
  plan: NutritionPlan;
  clientName: string | null;
  coach: CoachProfile;
  i18n: I18n;
}

export async function renderNutritionPdf({ plan, clientName, coach, i18n }: Input): Promise<Buffer> {
  registerFonts();
  const urls = [...new Set(plan.meals.map((m) => m.imageUrl).filter((u): u is string => Boolean(u)))];
  const images = new Map<string, PdfImage | null>(await Promise.all(urls.map(async (u) => [u, await loadImage(u)] as const)));
  return renderToBuffer(<NutritionDocument plan={plan} clientName={clientName} coach={coach} images={images} i18n={i18n} />);
}

function NutritionDocument({ plan, clientName, coach, images, i18n }: Input & { images: Map<string, PdfImage | null> }) {
  const { t, fmt } = i18n;
  const avg = weeklyAverage(plan.meals);
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => plan.meals.some((m) => m.day === d));
  const targets = plan.targets;
  const g = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${fmt.number(v)} g`);
  const [P, Cb, G] = [t("macro|P"), t("macro|C"), t("macro|G")];
  const amountOf = (m: MealEntry) => (m.amount !== null && m.unit ? `${fmt.number(m.amount, 1)} ${m.unit}` : "");

  return (
    <Document title={plan.name} author={coach.fullName} creator="Forma" producer="Forma" language={i18n.locale}>
      <Page size="A4" style={base.page}>
        <DocHeader
          kind={t("Piano alimentare")}
          title={plan.name}
          client={clientName}
          coach={coach.fullName}
          studio={coach.studioName}
          status={t(NUTRITION_STATUS_LABELS[plan.status])}
          i18n={i18n}
        />
        <View style={base.body}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Stat label={t("Media giornaliera")} value={avg ? `${fmt.number(avg.kcal)} kcal` : "—"} />
            <Stat label={t("Proteine")} value={avg ? g(avg.protein) : "—"} />
            <Stat label={t("Carboidrati")} value={avg ? g(avg.carbs) : "—"} />
            <Stat label={t("Grassi")} value={avg ? g(avg.fat) : "—"} />
          </View>
          {hasTargets(targets) && (
            <Text style={{ ...base.small, marginTop: 6 }}>
              {t("Obiettivi giornalieri")}: {[targets.kcal !== null ? `${fmt.number(targets.kcal)} kcal` : null, targets.protein !== null ? `${P} ${g(targets.protein)}` : null, targets.carbs !== null ? `${Cb} ${g(targets.carbs)}` : null, targets.fat !== null ? `${G} ${g(targets.fat)}` : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          {plan.notes && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 9, fontWeight: 600, color: C.forest }}>{t("Indicazioni generali")}</Text>
              <Text style={base.notes}>{plan.notes}</Text>
            </View>
          )}
          {days.length === 0 && <Text style={{ marginTop: 18, color: C.muted }}>{t("Nessun pasto in questo piano.")}</Text>}

          {days.map((d) => {
            const s = daySummary(plan.meals, d);
            const date = plan.weekStart ? fmt.dayKey(addDaysToKey(plan.weekStart, d), { day: "numeric", month: "long" }) : null;
            return (
              <View key={d} style={{ marginTop: 18 }}>
                <View minPresenceAhead={90} style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", borderBottomWidth: 1.2, borderBottomColor: C.forest, paddingBottom: 5 }}>
                  <Text style={base.h2}>
                    {t(WEEKDAY_LABELS[d])}
                    {date ? <Text style={{ fontSize: 9, fontWeight: 500, color: C.muted }}>{`  ${date}`}</Text> : null}
                  </Text>
                  <Text style={{ fontSize: 8, color: C.muted }}>
                    {s.entries > s.unknown ? `${fmt.number(s.kcal)} kcal  ·  ${P} ${fmt.number(s.protein)} g  ·  ${Cb} ${fmt.number(s.carbs)} g  ·  ${G} ${fmt.number(s.fat)} g` : t("valori n/d")}
                  </Text>
                </View>
                {MEAL_SLOTS.map((slot) => {
                  const entries = cellEntries(plan.meals, d, slot);
                  if (!entries.length) return null;
                  return (
                    <View key={slot} wrap={false} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.6, borderBottomColor: C.border }}>
                      <Text style={{ width: 92, fontSize: 8.5, fontWeight: 600, color: C.forest, paddingTop: 3 }}>{t(MEAL_SLOT_LABELS[slot])}</Text>
                      <View style={{ flex: 1, gap: 5 }}>
                        {entries.map((m) => {
                          const img = m.imageUrl ? images.get(m.imageUrl) : null;
                          return (
                            <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                              {img ? <Image src={img} style={{ width: 18, height: 18, objectFit: "contain" }} /> : <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: C.tile }} />}
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 9, fontWeight: 600 }}>
                                  {m.name}
                                  {amountOf(m) ? <Text style={{ fontWeight: 400, color: C.muted }}>{`  ${amountOf(m)}`}</Text> : null}
                                </Text>
                                {m.notes && <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 1 }}>{m.notes}</Text>}
                              </View>
                              <Text style={{ width: 150, fontSize: 7.5, color: C.muted, textAlign: "right" }}>
                                {m.kcal !== null ? `${fmt.number(m.kcal)} kcal · ${P} ${fmt.number(m.protein ?? 0)} · ${Cb} ${fmt.number(m.carbs ?? 0)} · ${G} ${fmt.number(m.fat ?? 0)}` : t("kcal n/d")}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
          <Text style={{ ...base.small, marginTop: 14 }}>
            {t("P = proteine · C = carboidrati · G = grassi. I valori sono indicativi e calcolati sulle porzioni indicate.")}
          </Text>
        </View>
        <DocFooter footer={coach.pdfFooter} i18n={i18n} />
      </Page>
    </Document>
  );
}
