"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { CircleAlert, Plus, Search, Trash2 } from "lucide-react";
import type { Food } from "@/lib/domain/types";
import { FOOD_CATEGORIES, FOOD_CATEGORY_LABELS, type FoodCategory, type FoodUnit } from "@/lib/domain/constants";
import { foodInput, recipeInput } from "@/lib/domain/schemas";
import { computeRecipe, kcalFromMacros } from "@/lib/domain/nutrition";
import { saveFoodAction, saveRecipeAction } from "@/lib/actions/library";
import { FOOD_ICONS } from "@/lib/data/seed/library";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Segmented } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/components/common/image-upload";
import { Thumb } from "@/components/common/basics";
import { cn, matches, parseDecimal } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

/* ------------------------------- Image picker ------------------------------ */
function FoodImagePicker({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-4">
      <Thumb src={value} className="size-20 rounded-2xl" contain sizes="80px" />
      <div className="flex flex-wrap gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              
              {t("Scegli illustrazione")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[332px] p-2">
            <div className="scrollbar-thin grid max-h-72 grid-cols-6 gap-1 overflow-y-auto">
              {FOOD_ICONS.map((icon) => {
                const src = `/foods/${icon}.png`;
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      onChange(src);
                      setOpen(false);
                    }}
                    className={cn("grid aspect-square place-items-center rounded-xl hover:bg-muted", value === src && "bg-pale ring-2 ring-primary/40")}
                    aria-label={icon.replace(/-/g, " ")}
                  >
                    <Image src={src} alt="" width={40} height={40} />
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
        <Button type="button" variant="outline" size="sm" loading={busy} onClick={() => fileRef.current?.click()}>
          
          {t("Carica foto")}
        </Button>
        {value && (
          <Button type="button" variant="destructive-ghost" size="sm" onClick={() => onChange(null)}>
            
            {t("Rimuovi")}
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            try {
              onChange(await uploadImage(f, "foods"));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t("Caricamento non riuscito"));
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </div>
    </div>
  );
}

/* --------------------------------- Food form -------------------------------- */
export function FoodFormSheet({ open, food, onOpenChange }: { open: boolean; food: Food | null; onOpenChange: (open: boolean) => void }) {
  const { fmt, t } = useI18n();
  const init = React.useCallback(
    () => ({
      name: food?.name ?? "",
      category: (food?.category ?? "other") as FoodCategory,
      imageUrl: food?.imageUrl ?? null,
      unit: (food?.unit ?? "g") as FoodUnit,
      servingSize: food ? String(food.servingSize).replace(".", ",") : "100",
      servingLabel: food?.servingLabel ?? "",
      kcal: food ? String(food.per100.kcal).replace(".", ",") : "",
      protein: food ? String(food.per100.protein).replace(".", ",") : "",
      carbs: food ? String(food.per100.carbs).replace(".", ",") : "",
      fat: food ? String(food.per100.fat).replace(".", ",") : "",
      sourceRef: food?.sourceRef ?? "",
    }),
    [food],
  );
  const [v, setV] = React.useState(init);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setV(init());
      setErrors({});
    }
  }

  const n = (s: string) => parseDecimal(s);
  const macros = { protein: n(v.protein) ?? 0, carbs: n(v.carbs) ?? 0, fat: n(v.fat) ?? 0 };
  const atwater = kcalFromMacros(macros);
  const kcal = n(v.kcal);
  const mismatch = kcal !== null && !Number.isNaN(kcal) && atwater > 0 && Math.abs(atwater - kcal) / Math.max(kcal, 1) > 0.15;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: v.name,
      category: v.category,
      imageUrl: v.imageUrl,
      unit: v.unit,
      servingSize: n(v.servingSize),
      servingLabel: v.servingLabel || null,
      per100: { kcal: n(v.kcal), protein: n(v.protein) ?? 0, carbs: n(v.carbs) ?? 0, fat: n(v.fat) ?? 0 },
      sourceRef: v.sourceRef || null,
    };
    const parsed = foodInput.safeParse(payload);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[i.path.join(".")] ??= i.message.replace("Input non valido: previsto number, ricevuto null", "Campo obbligatorio");
      setErrors(out);
      return;
    }
    setSaving(true);
    const res = await saveFoodAction(food?.id ?? null, parsed.data);
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(food ? t("Alimento aggiornato") : t("Alimento aggiunto alla libreria"));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{food ? t("Modifica alimento") : t("Nuovo alimento")}</SheetTitle>
            <SheetDescription>{t("Inserisci i valori dall'etichetta o da una banca dati affidabile, riferiti a 100 {unit}.", { unit: v.unit })}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5">
            <FoodImagePicker value={v.imageUrl} onChange={(imageUrl) => setV({ ...v, imageUrl })} />
            <Field label={t("Nome")} htmlFor="f-name" error={errors.name}>
              <Input id="f-name" value={v.name} maxLength={80} onChange={(e) => setV({ ...v, name: e.target.value })} aria-invalid={!!errors.name} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Field label={t("Categoria")}>
                <Select aria-label={t("Categoria")} value={v.category} onValueChange={(category) => setV({ ...v, category })} options={FOOD_CATEGORIES.map((c) => ({ value: c, label: t(FOOD_CATEGORY_LABELS[c]) }))} />
              </Field>
              <Field label={t("Unità")}>
                <Segmented aria-label={t("Unità")} value={v.unit} onValueChange={(unit) => setV({ ...v, unit })} options={[{ value: "g", label: t("Grammi") }, { value: "ml", label: t("Millilitri") }]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("Porzione tipo ({unit})", { unit: v.unit })} htmlFor="f-serving" error={errors.servingSize}>
                <Input id="f-serving" inputMode="decimal" value={v.servingSize} onChange={(e) => setV({ ...v, servingSize: e.target.value })} />
              </Field>
              <Field label={t("Descrizione porzione")} htmlFor="f-label" optional>
                <Input id="f-label" value={v.servingLabel} maxLength={60} placeholder={t("Es. 1 vasetto")} onChange={(e) => setV({ ...v, servingLabel: e.target.value })} />
              </Field>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="mb-3 text-[13.5px] font-semibold">{t("Valori per 100")}{" "}{v.unit}</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["kcal", msg("Energia (kcal)")],
                    ["protein", msg("Proteine (g)")],
                    ["carbs", msg("Carboidrati (g)")],
                    ["fat", msg("Grassi (g)")],
                  ] as const
                ).map(([k, l]) => (
                  <Field key={k} label={t(l)} htmlFor={`f-${k}`} error={errors[`per100.${k}`]}>
                    <Input id={`f-${k}`} inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} aria-invalid={!!errors[`per100.${k}`]} />
                  </Field>
                ))}
              </div>
              {mismatch && (
                <p className="mt-3 flex items-start gap-1.5 text-[12.5px] text-warning">
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                  
                  {t("Dai macronutrienti risultano circa {atwater} kcal: controlla i valori (fibre e alcol possono spiegare piccole differenze).", { atwater: fmt.number(atwater) })}
                </p>
              )}
            </div>
            <Field label={t("Fonte dei dati")} htmlFor="f-source" optional hint={t("Es. etichetta del prodotto, CREA, USDA FoodData Central #171287")}>
              <Input id="f-source" value={v.sourceRef} maxLength={120} onChange={(e) => setV({ ...v, sourceRef: e.target.value })} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              
              {t("Annulla")}
            </Button>
            <Button type="submit" loading={saving}>
              {food ? t("Salva modifiche") : t("Aggiungi alimento")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- Recipe form ------------------------------- */
export function RecipeFormSheet({ open, recipe, foods, onOpenChange }: { open: boolean; recipe: Food | null; foods: Food[]; onOpenChange: (open: boolean) => void }) {
  const { fmt, t } = useI18n();
  const simpleFoods = React.useMemo(() => foods.filter((f) => f.kind === "food"), [foods]);
  const byId = React.useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const init = React.useCallback(
    () => ({
      name: recipe?.name ?? "",
      category: (recipe?.category ?? "dishes") as FoodCategory,
      imageUrl: recipe?.imageUrl ?? null,
      servings: String(recipe?.servings ?? 1),
      servingLabel: recipe?.servingLabel ?? "",
      ingredients: recipe?.ingredients.map((i) => ({ foodId: i.foodId, amount: String(i.amount).replace(".", ",") })) ?? [],
    }),
    [recipe],
  );
  const [v, setV] = React.useState(init);
  const [query, setQuery] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setV(init());
      setErrors({});
      setQuery("");
    }
  }

  const ingredients = v.ingredients.map((i) => ({ foodId: i.foodId, amount: parseDecimal(i.amount) ?? 0 })).filter((i) => i.amount > 0);
  const servings = Math.max(1, Math.round(parseDecimal(v.servings) ?? 1));
  const computed = computeRecipe(ingredients, byId, servings);
  const results = query.trim() ? simpleFoods.filter((f) => matches(f.name, query) && !v.ingredients.some((i) => i.foodId === f.id)).slice(0, 8) : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: v.name,
      category: v.category,
      imageUrl: v.imageUrl,
      servings: Math.round(parseDecimal(v.servings) ?? 0),
      servingLabel: v.servingLabel || null,
      ingredients: v.ingredients.map((i) => ({ foodId: i.foodId, amount: parseDecimal(i.amount) })),
    };
    const parsed = recipeInput.safeParse(payload);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      setErrors(out);
      return;
    }
    setSaving(true);
    const res = await saveRecipeAction(recipe?.id ?? null, parsed.data);
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(recipe ? t("Ricetta aggiornata") : t("Ricetta aggiunta alla libreria"));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-[580px]">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{recipe ? t("Modifica ricetta") : t("Nuova ricetta")}</SheetTitle>
            <SheetDescription>{t("I valori nutrizionali sono calcolati dagli ingredienti della libreria.")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5">
            <FoodImagePicker value={v.imageUrl} onChange={(imageUrl) => setV({ ...v, imageUrl })} />
            <Field label={t("Nome")} htmlFor="r-name" error={errors.name}>
              <Input id="r-name" value={v.name} maxLength={80} placeholder={t("Es. Pollo e riso")} onChange={(e) => setV({ ...v, name: e.target.value })} aria-invalid={!!errors.name} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("Porzioni")} htmlFor="r-servings" error={errors.servings}>
                <Input id="r-servings" inputMode="numeric" value={v.servings} onChange={(e) => setV({ ...v, servings: e.target.value })} />
              </Field>
              <Field label={t("Descrizione porzione")} htmlFor="r-label" optional>
                <Input id="r-label" value={v.servingLabel} maxLength={60} placeholder={t("Es. 1 piatto")} onChange={(e) => setV({ ...v, servingLabel: e.target.value })} />
              </Field>
            </div>

            <Field label={t("Ingredienti")} error={errors.ingredients}>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Cerca un alimento da aggiungere…")} className="pl-9" aria-label={t("Cerca ingrediente")} />
                {results.length > 0 && (
                  <ul className="absolute inset-x-0 top-full z-10 mt-1 rounded-2xl border bg-popover p-1 shadow-pop">
                    {results.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setV({ ...v, ingredients: [...v.ingredients, { foodId: f.id, amount: String(f.servingSize).replace(".", ",") }] });
                            setQuery("");
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted"
                        >
                          <Thumb src={f.imageUrl} className="size-8 rounded-lg" contain sizes="32px" />
                          <span className="flex-1 truncate text-[13.5px] font-medium">{f.name}</span>
                          <Plus className="size-4 text-primary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {v.ingredients.length === 0 ? (
                <p className="rounded-2xl border border-dashed p-4 text-center text-[13px] text-muted-foreground">{t("Aggiungi gli ingredienti con le quantità crude.")}</p>
              ) : (
                <ul className="flex flex-col divide-y rounded-2xl border">
                  {v.ingredients.map((ing, i) => {
                    const f = byId.get(ing.foodId);
                    return (
                      <li key={ing.foodId} className="flex items-center gap-3 px-3 py-2">
                        <Thumb src={f?.imageUrl} className="size-9 rounded-lg" contain sizes="36px" />
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{f?.name ?? t("Alimento rimosso")}</span>
                        <div className="relative w-28">
                          <Input
                            inputMode="decimal"
                            value={ing.amount}
                            aria-label={t("Quantità {name}", { name: f?.name ?? "" })}
                            onChange={(e) => setV({ ...v, ingredients: v.ingredients.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)) })}
                            className="h-9 pr-9 text-right"
                          />
                          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12.5px] text-muted-foreground">{f?.unit ?? "g"}</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("Rimuovi ingrediente")} onClick={() => setV({ ...v, ingredients: v.ingredients.filter((_, k) => k !== i) })}>
                          <Trash2 />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Field>

            <div className="rounded-2xl bg-tile p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13.5px] font-semibold">{t("Per porzione")}</span>
                <span className="text-[12px] text-muted-foreground tabular">
                  
                  {t("{servingSize} g · totale {totalWeight} g", { servingSize: fmt.number(computed.servingSize), totalWeight: fmt.number(computed.totalWeight) })}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {(
                  [
                    ["kcal", fmt.number(computed.perServing.kcal)],
                    [msg("Proteine"), `${fmt.number(computed.perServing.protein, 1)} g`],
                    [msg("Carboidrati"), `${fmt.number(computed.perServing.carbs, 1)} g`],
                    [msg("Grassi"), `${fmt.number(computed.perServing.fat, 1)} g`],
                  ] as const
                ).map(([l, val]) => (
                  <div key={l} className="rounded-xl bg-card px-1 py-2">
                    <div className="text-[11px] text-muted-foreground">{t(l)}</div>
                    <div className="text-[14.5px] font-semibold tabular">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              
              {t("Annulla")}
            </Button>
            <Button type="submit" loading={saving}>
              {recipe ? t("Salva ricetta") : t("Crea ricetta")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
