"use client";

import * as React from "react";
import { Calculator, PencilLine, Search, Trash2, X } from "lucide-react";
import type { Food, MealEntry } from "@/lib/domain/types";
import { FOOD_SOURCE_LABELS, MEAL_SLOT_LABELS, MEAL_UNITS, WEEKDAY_LABELS, type MealUnit } from "@/lib/domain/constants";
import { scaleNutrients } from "@/lib/domain/nutrition";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Thumb } from "@/components/common/basics";
import { cn, matches, parseDecimal, round } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { useTouchDevice } from "@/lib/hooks/use-touch";
import { msg } from "@/lib/i18n/core";

interface Props {
  entry: MealEntry;
  isNew: boolean;
  foods: Food[];
  onSave: (entry: MealEntry) => void;
  onDelete?: () => void;
  onCancel: () => void;
  extraActions?: React.ReactNode;
}

const toInput = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

/**
 * Meal entry form. Values come from the food library (scaled to the portion) or are typed by the coach.
 * Unknown values stay empty — nothing is estimated from the food name.
 */
export function MealEditor({ entry, isNew, foods, onSave, onDelete, onCancel, extraActions }: Props) {
  const touch = useTouchDevice();
  const { fmt, t } = useI18n();
  const byId = React.useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const [food, setFood] = React.useState<Food | null>(entry.foodId ? (byId.get(entry.foodId) ?? null) : null);
  const [name, setName] = React.useState(entry.name);
  const [amount, setAmount] = React.useState(toInput(entry.amount));
  const [unit, setUnit] = React.useState<MealUnit>(entry.unit ?? "g");
  const [manual, setManual] = React.useState(entry.nutritionSource === "manual" || (!entry.foodId && entry.nutritionSource !== "food"));
  const [values, setValues] = React.useState({ kcal: toInput(entry.kcal), protein: toInput(entry.protein), carbs: toInput(entry.carbs), fat: toInput(entry.fat) });
  const [notes, setNotes] = React.useState(entry.notes ?? "");
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(isNew && !entry.foodId);
  const [error, setError] = React.useState<string | null>(null);

  const results = React.useMemo(() => foods.filter((f) => matches(f.name, query)).slice(0, 40), [foods, query]);
  const parsedAmount = parseDecimal(amount);
  const computed = food && !manual && parsedAmount !== null && !Number.isNaN(parsedAmount) ? scaleNutrients(food.per100, parsedAmount) : null;

  const chooseFood = (f: Food) => {
    setFood(f);
    setName(f.name);
    setUnit(f.unit);
    setAmount(toInput(f.servingSize));
    setManual(false);
    setSearching(false);
    setQuery("");
    setError(null);
  };

  const applyFreeText = () => {
    setFood(null);
    setName(query.trim());
    setManual(true);
    setSearching(false);
    setValues({ kcal: "", protein: "", carbs: "", fat: "" });
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(t("Inserisci il nome del pasto"));
    if (parsedAmount !== null && (Number.isNaN(parsedAmount) || parsedAmount < 0 || parsedAmount > 5000)) return setError(t("Porzione non valida"));
    let nutrition: Pick<MealEntry, "kcal" | "protein" | "carbs" | "fat" | "nutritionSource">;
    if (computed) {
      nutrition = { ...computed, nutritionSource: "food" };
    } else if (food && !manual) {
      nutrition = { kcal: null, protein: null, carbs: null, fat: null, nutritionSource: null };
    } else {
      const parse = (v: string, max: number) => {
        const n = parseDecimal(v);
        if (n === null) return null;
        if (Number.isNaN(n) || n < 0 || n > max) throw new Error("bad");
        return round(n, 1);
      };
      try {
        const kcal = parse(values.kcal, 5000);
        const protein = parse(values.protein, 500);
        const carbs = parse(values.carbs, 1000);
        const fat = parse(values.fat, 500);
        const any = [kcal, protein, carbs, fat].some((v) => v !== null);
        nutrition = { kcal, protein, carbs, fat, nutritionSource: any ? "manual" : null };
      } catch {
        return setError(t("Controlla i valori nutrizionali"));
      }
    }
    onSave({
      ...entry,
      foodId: food?.id ?? null,
      name: trimmed.slice(0, 80),
      imageUrl: food?.imageUrl ?? (entry.foodId === null ? entry.imageUrl : null),
      amount: parsedAmount === null ? null : round(parsedAmount, 1),
      unit: parsedAmount === null ? null : food ? food.unit : unit,
      ...nutrition,
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="text-[12.5px] font-medium text-muted-foreground">
        {t(WEEKDAY_LABELS[entry.day])} · {t(MEAL_SLOT_LABELS[entry.slot])}
      </div>

      {searching ? (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus={!touch}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Cerca un alimento o una ricetta…")}
              className="pl-9"
              aria-label={t("Cerca nella libreria alimenti")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[0]) chooseFood(results[0]);
                  else if (query.trim()) applyFreeText();
                }
              }}
            />
          </div>
          <ul className="scrollbar-thin max-h-60 overflow-y-auto rounded-xl border p-1">
            {results.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => chooseFood(f)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted">
                  <Thumb src={f.imageUrl} className="size-9 rounded-lg" contain sizes="36px" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[13.5px] font-medium">{f.name}</div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {f.kind === "recipe" ? `${t("Ricetta")} · ` : ""}
                      
                      {t("{kcal} kcal/100 {unit} · porzione {servingSize} {unit2}", { kcal: fmt.number(f.per100.kcal), unit: f.unit, servingSize: fmt.number(f.servingSize), unit2: f.unit })}
                    </div>
                  </div>
                </button>
              </li>
            ))}
            {query.trim() && (
              <li>
                <button type="button" onClick={applyFreeText} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[13.5px] font-medium text-primary hover:bg-pale">
                  <PencilLine className="size-4" /> {t("Usa “{query}” come testo libero", { query: query.trim() })}
                </button>
              </li>
            )}
            {!results.length && !query.trim() && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">{t("Libreria vuota")}</li>}
          </ul>
          {!isNew && (
            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setSearching(false)}>
              
              {t("Annulla ricerca")}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-tile p-2.5">
          <Thumb src={food?.imageUrl ?? entry.imageUrl} className="size-12 rounded-xl bg-card" contain sizes="48px" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold">{food ? food.name : t("Testo libero")}</div>
            <div className="truncate text-[12px] text-muted-foreground">
              {food ? t("{kcal} kcal/100 {unit} · {source}", { kcal: fmt.number(food.per100.kcal), unit: food.unit, source: t(FOOD_SOURCE_LABELS[food.source]) }) : t("Nessun collegamento alla libreria")}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setSearching(true)}>
            
            {t("Cambia")}
          </Button>
        </div>
      )}

      {!searching && (
        <>
          <Field label={t("Nome visualizzato")} htmlFor="meal-name" error={error && !name.trim() ? error : undefined}>
            <Input id="meal-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </Field>

          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Field label={t("Porzione")} htmlFor="meal-amount" hint={food?.servingLabel ? t("Porzione tipo: {servingLabel}", { servingLabel: food.servingLabel }) : undefined}>
              <Input id="meal-amount" inputMode="decimal" value={amount} placeholder="—" onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t("Unità")}>
              {food ? (
                <div className="flex h-10 items-center rounded-xl border border-input bg-muted px-3 text-[14px] text-muted-foreground">{food.unit}</div>
              ) : (
                <Select aria-label={t("Unità")} value={unit} onValueChange={setUnit} options={MEAL_UNITS.map((u) => ({ value: u, label: u }))} />
              )}
            </Field>
          </div>

          <div className="rounded-2xl border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold">{t("Valori nutrizionali")}</span>
              {food && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    if (!manual && computed) setValues({ kcal: toInput(computed.kcal), protein: toInput(computed.protein), carbs: toInput(computed.carbs), fat: toInput(computed.fat) });
                    setManual((m) => !m);
                  }}
                >
                  {manual ? (
                    <>
                      <Calculator /> {t("Calcola dalla libreria")}
                    </>
                  ) : (
                    <>
                      <PencilLine /> {t("Modifica a mano")}
                    </>
                  )}
                </Button>
              )}
            </div>
            {computed ? (
              <div className="grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    [msg("Energia"), `${fmt.number(computed.kcal)}`, "kcal"],
                    [msg("Proteine"), fmt.number(computed.protein, 1), "g"],
                    [msg("Carboidrati"), fmt.number(computed.carbs, 1), "g"],
                    [msg("Grassi"), fmt.number(computed.fat, 1), "g"],
                  ] as const
                ).map(([l, v, u]) => (
                  <div key={l} className="rounded-xl bg-tile px-1 py-2">
                    <div className="text-[11px] text-muted-foreground">{t(l)}</div>
                    <div className="text-[14.5px] font-semibold tabular">
                      {v}
                      <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{u}</span>
                    </div>
                  </div>
                ))}
                <p className="col-span-4 text-left text-[11.5px] text-muted-foreground">{t("Calcolati dalla libreria per la porzione indicata.")}</p>
              </div>
            ) : food && !manual ? (
              <p className="text-[12.5px] text-muted-foreground">{t("Indica la porzione per calcolare i valori dalla libreria.")}</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1">
                      <span className="text-[11px] text-muted-foreground">{k === "kcal" ? "kcal" : k === "protein" ? t("Prot. (g)") : k === "carbs" ? t("Carb. (g)") : t("Grassi (g)")}</span>
                      <Input inputMode="decimal" value={values[k]} placeholder="—" onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} className="h-9 px-2 text-center" />
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">{t("Lascia vuoto ciò che non conosci: i valori mancanti non vengono stimati e sono segnalati nei totali.")}</p>
              </>
            )}
          </div>

          <Field label={t("Note")} htmlFor="meal-notes" optional>
            <Textarea id="meal-notes" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Es. cottura al vapore, condimento a parte")} />
          </Field>
        </>
      )}

      {error && name.trim() && <p className="text-[12.5px] font-medium text-destructive">{error}</p>}
      {extraActions}

      <div className={cn("flex items-center gap-2", onDelete ? "justify-between" : "justify-end")}>
        {onDelete && (
          <Button type="button" variant="destructive-ghost" size="sm" onClick={onDelete}>
            <Trash2 /> {t("Elimina")}
          </Button>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            <X /> {t("Annulla")}
          </Button>
          <Button type="submit" size="sm" disabled={searching}>
            {isNew ? t("Aggiungi") : t("Salva")}
          </Button>
        </div>
      </div>
    </form>
  );
}
