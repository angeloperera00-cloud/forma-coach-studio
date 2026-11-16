import type { Activity } from "@/lib/domain/types";
import { addDaysToKey, dayKeyOf, timeOf, todayKey } from "@/lib/datetime";
import type { I18n } from "./core";

/**
 * Activity/notification texts are stored as Italian templates + params and rendered
 * in the active language here (e.g. "{when} alle {time}" → "Tomorrow at 07:30").
 */
export function activityText(a: Pick<Activity, "title" | "description" | "params">, { t, fmt }: I18n) {
  const raw = a.params ?? {};
  const p: Record<string, string | number> = { ...raw };
  if (typeof raw.startsAt === "string") {
    const day = dayKeyOf(raw.startsAt);
    const today = todayKey();
    p.when =
      day === today
        ? t("Oggi")
        : day === addDaysToKey(today, 1)
          ? t("Domani")
          : day === addDaysToKey(today, -1)
            ? t("Ieri")
            : fmt.instant(raw.startsAt, { weekday: "long", day: "numeric", month: "long" }, true);
    p.time = timeOf(raw.startsAt);
  }
  if (typeof raw.weight === "number") p.weight = fmt.number(raw.weight, 1);
  if (typeof raw.typeLabel === "string") p.typeLabel = t(raw.typeLabel);
  return {
    title: t(a.title, p),
    description: a.description ? t(a.description, p) : null,
  };
}
