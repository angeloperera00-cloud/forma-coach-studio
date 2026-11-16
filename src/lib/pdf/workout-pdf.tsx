import "server-only";
/* eslint-disable jsx-a11y/alt-text -- react-pdf <Image> is not an HTML img */
import React from "react";
import { Document, Image, Page, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { CoachProfile, Exercise, WorkoutPlan } from "@/lib/domain/types";
import { GOAL_LABELS, MUSCLE_LABELS, WEEKDAY_LABELS, WORKOUT_CATEGORY_LABELS, WORKOUT_STATUS_LABELS } from "@/lib/domain/constants";
import { dayStats, formatRest, planStats, sortDays, supersetInfo } from "@/lib/domain/workout";
import type { I18n } from "@/lib/i18n/core";
import { C, DocFooter, DocHeader, Stat, base, loadImage, registerFonts, type PdfImage } from "./shared";

interface Input {
  plan: WorkoutPlan;
  clientName: string | null;
  coach: CoachProfile;
  exercises: Exercise[];
  i18n: I18n;
}

export async function renderWorkoutPdf({ plan, clientName, coach, exercises, i18n }: Input): Promise<Buffer> {
  registerFonts();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const used = [...new Set(plan.days.flatMap((d) => d.exercises.map((x) => x.exerciseId)))];
  const images = new Map<string, PdfImage | null>(await Promise.all(used.map(async (id) => [id, await loadImage(byId.get(id)?.imageUrls[0])] as const)));
  return renderToBuffer(<WorkoutDocument plan={plan} clientName={clientName} coach={coach} byId={byId} images={images} i18n={i18n} />);
}

function WorkoutDocument({ plan, clientName, coach, byId, images, i18n }: Omit<Input, "exercises"> & { byId: Map<string, Exercise>; images: Map<string, PdfImage | null> }) {
  const { t, tn, fmt } = i18n;
  const days = sortDays(plan.days).filter((d) => d.exercises.length > 0 || d.title || d.notes);
  const stats = planStats(plan, byId);
  return (
    <Document title={plan.name} author={coach.fullName} creator="Forma" producer="Forma" language={i18n.locale}>
      <Page size="A4" style={base.page}>
        <DocHeader
          kind={t("Scheda di allenamento")}
          title={plan.name}
          client={clientName}
          coach={coach.fullName}
          studio={coach.studioName}
          status={t(WORKOUT_STATUS_LABELS[plan.status])}
          i18n={i18n}
        />
        <View style={base.body}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Stat label={t("Giorni di allenamento")} value={String(stats.days)} />
            <Stat label={t("Esercizi")} value={String(stats.exerciseCount)} />
            <Stat label={t("Serie totali")} value={String(stats.totalSets)} />
            <Stat label={t("Minuti a settimana")} value={`≈ ${fmt.number(stats.weeklyMinutes)}`} />
          </View>
          {plan.notes && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 9, fontWeight: 600, color: C.forest }}>{t("Indicazioni generali")}</Text>
              <Text style={base.notes}>{plan.notes}</Text>
            </View>
          )}

          {days.length === 0 && <Text style={{ marginTop: 18, color: C.muted }}>{t("Nessun allenamento in questa scheda.")}</Text>}

          {days.map((day) => {
            const s = dayStats(day, byId);
            const supersets = supersetInfo(day.exercises);
            const meta = [
              day.category ? t(WORKOUT_CATEGORY_LABELS[day.category]) : null,
              day.goal ? t(GOAL_LABELS[day.goal]) : null,
              `${day.durationMinutes ? "" : "≈ "}${s.minutes} min`,
              tn("{n} esercizio", "{n} esercizi", s.exerciseCount),
              tn("one|{n} serie", "{n} serie", s.totalSets),
            ].filter(Boolean);
            return (
              <View key={day.id} style={{ marginTop: 18 }} wrap>
                <View minPresenceAhead={80} style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", borderBottomWidth: 1.2, borderBottomColor: C.forest, paddingBottom: 5 }}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={base.h2}>
                      {t(WEEKDAY_LABELS[day.weekday])}
                      {day.title ? <Text style={{ color: C.text }}>{` — ${day.title}`}</Text> : null}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 8, color: C.muted }}>{meta.join("  ·  ")}</Text>
                </View>
                {day.notes && <Text style={base.notes}>{day.notes}</Text>}

                <View style={{ flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, marginTop: 6, backgroundColor: C.pale, borderRadius: 4 }}>
                  <Text style={{ width: 22, fontSize: 7.5, fontWeight: 600, color: C.forest }}>#</Text>
                  <Text style={{ flex: 1, fontSize: 7.5, fontWeight: 600, color: C.forest }}>{t("Esercizio")}</Text>
                  <Text style={{ width: 44, fontSize: 7.5, fontWeight: 600, color: C.forest, textAlign: "center" }}>{t("Serie")}</Text>
                  <Text style={{ width: 54, fontSize: 7.5, fontWeight: 600, color: C.forest, textAlign: "center" }}>{t("Ripetizioni")}</Text>
                  <Text style={{ width: 46, fontSize: 7.5, fontWeight: 600, color: C.forest, textAlign: "center" }}>{t("Recupero")}</Text>
                  <Text style={{ width: 48, fontSize: 7.5, fontWeight: 600, color: C.forest, textAlign: "center" }}>{t("Carico")}</Text>
                  <Text style={{ width: 44, fontSize: 7.5, fontWeight: 600, color: C.forest, textAlign: "center" }}>{t("Tempo")}</Text>
                </View>

                {day.exercises.map((x, i) => {
                  const ex = byId.get(x.exerciseId);
                  const img = images.get(x.exerciseId);
                  const ss = supersets.get(x.id);
                  return (
                    <View key={x.id} wrap={false} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 0.6, borderBottomColor: C.border }}>
                      <Text style={{ width: 22, fontSize: 9, fontWeight: 700, color: C.muted }}>{i + 1}</Text>
                      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 6 }}>
                        {img ? (
                          <Image src={img} style={{ width: 46, height: 31, borderRadius: 4, objectFit: "cover" }} />
                        ) : (
                          <View style={{ width: 46, height: 31, borderRadius: 4, backgroundColor: C.tile }} />
                        )}
                        <View style={{ flexShrink: 1 }}>
                          <Text style={{ fontSize: 9.5, fontWeight: 600 }}>
                            {ss ? <Text style={{ color: C.primary }}>{`${ss.label}${ss.index} `}</Text> : null}
                            {ex?.name ?? t("Esercizio rimosso dalla libreria")}
                          </Text>
                          {ex && <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 1 }}>{ex.primaryMuscles.map((m) => t(MUSCLE_LABELS[m])).join(", ")}</Text>}
                          {x.notes && <Text style={{ fontSize: 7.5, color: C.text, marginTop: 2 }}>{x.notes}</Text>}
                        </View>
                      </View>
                      <Text style={{ width: 44, textAlign: "center", fontWeight: 700 }}>{x.sets}</Text>
                      <Text style={{ width: 54, textAlign: "center", fontWeight: 700 }}>{x.reps}</Text>
                      <Text style={{ width: 46, textAlign: "center" }}>{formatRest(x.restSeconds)}</Text>
                      <Text style={{ width: 48, textAlign: "center" }}>{x.weightKg !== null ? `${fmt.number(x.weightKg, 1)} kg` : "—"}</Text>
                      <Text style={{ width: 44, textAlign: "center" }}>{x.tempo || "—"}</Text>
                    </View>
                  );
                })}
                {[...new Set([...supersets.values()].map((s) => s.label))].length > 0 && (
                  <Text style={{ ...base.small, marginTop: 4 }}>{t("Le lettere indicano i superset: esegui gli esercizi con la stessa lettera uno dopo l'altro, poi recupera.")}</Text>
                )}
              </View>
            );
          })}
        </View>
        <DocFooter footer={coach.pdfFooter} i18n={i18n} />
      </Page>
    </Document>
  );
}
