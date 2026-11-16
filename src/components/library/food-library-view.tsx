"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChefHat, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Food } from "@/lib/domain/types";
import { FOOD_CATEGORIES, FOOD_CATEGORY_LABELS, FOOD_SOURCE_LABELS, type FoodCategory } from "@/lib/domain/constants";
import { scaleNutrients } from "@/lib/domain/nutrition";
import { deleteFoodAction } from "@/lib/actions/library";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Select } from "@/components/ui/menus";
import { Segmented } from "@/components/ui/misc";
import { EmptyState, Panel, Thumb } from "@/components/common/basics";
import { useConfirm } from "@/components/common/confirm";
import { FoodFormSheet, RecipeFormSheet } from "./food-forms";
import { matches } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

type Kind = "all" | "food" | "recipe";

export function FoodLibraryView({ foods }: { foods: Food[] }) {
  const { tn, fmt, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<Kind>("all");
  const [category, setCategory] = React.useState<FoodCategory | "all">("all");
  const [foodForm, setFoodForm] = React.useState<{ open: boolean; food: Food | null }>({ open: false, food: null });
  const [recipeForm, setRecipeForm] = React.useState<{ open: boolean; recipe: Food | null }>({ open: false, recipe: null });

  const edit = React.useCallback((f: Food) => (f.kind === "recipe" ? setRecipeForm({ open: true, recipe: f }) : setFoodForm({ open: true, food: f })), []);

  // ?open=<id> (from global search) opens the editor once, then the URL is cleaned up.
  const openId = params.get("open");
  const [handledOpenId, setHandledOpenId] = React.useState<string | null>(null);
  if (openId && openId !== handledOpenId) {
    setHandledOpenId(openId);
    const f = foods.find((x) => x.id === openId);
    if (f) edit(f);
  }
  React.useEffect(() => {
    if (openId) router.replace("/foods", { scroll: false });
  }, [openId, router]);

  const visible = foods.filter((f) => (kind === "all" || f.kind === kind) && (category === "all" || f.category === category) && matches(f.name, query));
  const counts = { all: foods.length, food: foods.filter((f) => f.kind === "food").length, recipe: foods.filter((f) => f.kind === "recipe").length };

  const remove = async (f: Food) => {
    if (!(await confirm({ title: t("Eliminare “{name}”?", { name: f.name }), description: t("I pasti già pianificati mantengono nome e valori salvati."), confirmLabel: t("Elimina"), destructive: true }))) return;
    const res = await deleteFoodAction(f.id);
    if (res.ok) toast.success(f.kind === "recipe" ? t("Ricetta eliminata") : t("Alimento eliminato"));
    else toast.error(res.error);
  };

  return (
    <>
      <Topbar
        title={t("Libreria alimenti")}
        breadcrumbs={[{ label: t("Libreria alimenti") }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setRecipeForm({ open: true, recipe: null })} className="max-sm:hidden">
              <ChefHat /> {t("Nuova ricetta")}
            </Button>
            <Button onClick={() => setFoodForm({ open: true, food: null })}>
              <Plus /> <span className="max-sm:hidden">{t("Nuovo alimento")}</span>
            </Button>
          </>
        }
      />
      <PageContainer>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            aria-label={t("Tipo")}
            value={kind}
            onValueChange={setKind}
            options={[
              { value: "all", label: t("Tutto"), badge: <span className="text-[11.5px] text-muted-foreground/80 tabular">{counts.all}</span> },
              { value: "food", label: t("Alimenti"), badge: <span className="text-[11.5px] text-muted-foreground/80 tabular">{counts.food}</span> },
              { value: "recipe", label: t("Ricette"), badge: <span className="text-[11.5px] text-muted-foreground/80 tabular">{counts.recipe}</span> },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Cerca alimento o ricetta…")} className="pl-9" aria-label={t("Cerca alimenti")} />
            </div>
            <Select aria-label={t("Categoria")} value={category} onValueChange={setCategory} className="sm:w-56" options={[{ value: "all", label: t("Tutte le categorie") }, ...FOOD_CATEGORIES.map((c) => ({ value: c, label: t(FOOD_CATEGORY_LABELS[c]) }))]} />
          </div>
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          
          {t("Valori per 100 g/ml. Gli alimenti di partenza sono contrassegnati come")}{" "}<span className="font-medium text-warning">{t("valori indicativi")}</span>{t(": verificali o sostituiscili con i dati della tua fonte di riferimento.")}
        </p>

        <Panel className="mt-3 overflow-hidden">
          {visible.length === 0 ? (
            <EmptyState
              emoji="fork-and-knife-with-plate"
              title={t("Nessun alimento trovato")}
              action={
                <Button onClick={() => setFoodForm({ open: true, food: null })}>
                  <Plus /> {t("Nuovo alimento")}
                </Button>
              }
            />
          ) : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-[12px] text-muted-foreground">
                    <th className="py-3 pr-3 pl-6 font-semibold">{t("Alimento")}</th>
                    <th className="px-3 py-3 font-semibold max-lg:hidden">{t("Categoria")}</th>
                    <th className="px-3 py-3 text-right font-semibold">kcal</th>
                    <th className="px-3 py-3 text-right font-semibold">{t("Prot.")}</th>
                    <th className="px-3 py-3 text-right font-semibold">{t("Carb.")}</th>
                    <th className="px-3 py-3 text-right font-semibold">{t("Grassi")}</th>
                    <th className="px-3 py-3 text-right font-semibold">{t("Porzione")}</th>
                    <th className="px-3 py-3 font-semibold max-xl:hidden">{t("Fonte")}</th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((f) => {
                    const portion = scaleNutrients(f.per100, f.servingSize);
                    return (
                      <tr key={f.id} onClick={() => edit(f)} className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/40">
                        <td className="py-2.5 pr-3 pl-6">
                          <div className="flex items-center gap-3">
                            <Thumb src={f.imageUrl} className="size-10 rounded-xl" contain sizes="40px" />
                            <div className="min-w-0 leading-tight">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-semibold">{f.name}</span>
                                {f.kind === "recipe" && (
                                  <Badge variant="forest" size="sm">
                                    
                                    {t("Ricetta")}
                                  </Badge>
                                )}
                              </div>
                              <div className="truncate text-[12px] text-muted-foreground">
                                {f.kind === "recipe" ? `${tn("{n} ingrediente", "{n} ingredienti", f.ingredients.length)} · ${tn("{n} porzione", "{n} porzioni", f.servings ?? 1)}` : (f.servingLabel ?? `${fmt.number(f.servingSize)} ${f.unit}`)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground max-lg:hidden">{t(FOOD_CATEGORY_LABELS[f.category])}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular">{fmt.number(f.per100.kcal)}</td>
                        <td className="px-3 py-2.5 text-right tabular">{fmt.number(f.per100.protein, 1)}</td>
                        <td className="px-3 py-2.5 text-right tabular">{fmt.number(f.per100.carbs, 1)}</td>
                        <td className="px-3 py-2.5 text-right tabular">{fmt.number(f.per100.fat, 1)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap text-muted-foreground tabular">
                          {fmt.number(f.servingSize)} {f.unit} · <span className="font-medium text-foreground">{fmt.number(portion.kcal)} kcal</span>
                        </td>
                        <td className="px-3 py-2.5 max-xl:hidden">
                          <Badge variant={f.source === "demo" ? "warning" : f.source === "external" ? "info" : "success"} size="sm">
                            {t(FOOD_SOURCE_LABELS[f.source])}
                          </Badge>
                        </td>
                        <td className="pr-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={t("Azioni per {name}", { name: f.name })}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => edit(f)}>
                                <Pencil /> {t("Modifica")}
                              </DropdownMenuItem>
                              <DropdownMenuItem destructive onSelect={() => remove(f)}>
                                <Trash2 /> {t("Elimina")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Button variant="outline" className="mt-4 w-full sm:hidden" onClick={() => setRecipeForm({ open: true, recipe: null })}>
          <ChefHat /> {t("Nuova ricetta")}
        </Button>
      </PageContainer>

      <FoodFormSheet open={foodForm.open} food={foodForm.food} onOpenChange={(open) => setFoodForm((x) => ({ ...x, open }))} />
      <RecipeFormSheet open={recipeForm.open} recipe={recipeForm.recipe} foods={foods} onOpenChange={(open) => setRecipeForm((x) => ({ ...x, open }))} />
    </>
  );
}
