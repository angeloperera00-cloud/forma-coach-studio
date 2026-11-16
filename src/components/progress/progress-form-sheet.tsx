"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createProgressAction } from "@/lib/actions/schedule";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/overlays";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseDecimal } from "@/lib/utils";
import { todayKey } from "@/lib/datetime";
import type { ProgressRecord } from "@/lib/domain/types";
import { useI18n } from "@/lib/i18n/client";
import { msg, msgp } from "@/lib/i18n/core";

const metric = (min: number, max: number, label: string) =>
  z.string().refine((v) => {
    const n = parseDecimal(v);
    return n === null || (!Number.isNaN(n) && n >= min && n <= max);
  }, msgp("{label}: valore tra {min} e {max}", { label, min, max }));

const schema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("Data non valida")).refine((v) => v <= todayKey(), msg("La data non può essere nel futuro")),
    weightKg: metric(25, 350, msg("Peso")),
    bodyFatPct: metric(2, 70, msg("Massa grassa")),
    waistCm: metric(30, 250, msg("Vita")),
    hipsCm: metric(30, 250, msg("Fianchi")),
    chestCm: metric(30, 250, msg("Petto")),
    armCm: metric(10, 90, msg("Braccio")),
    thighCm: metric(20, 120, msg("Coscia")),
    notes: z.string().max(500, msg("Massimo 500 caratteri")),
  })
  .refine((v) => [v.weightKg, v.bodyFatPct, v.waistCm, v.hipsCm, v.chestCm, v.armCm, v.thighCm].some((x) => x.trim() !== ""), {
    message: msg("Inserisci almeno una misurazione"),
    path: ["weightKg"],
  });
type Values = z.infer<typeof schema>;

const EMPTY = (): Values => ({ date: todayKey(), weightKg: "", bodyFatPct: "", waistCm: "", hipsCm: "", chestCm: "", armCm: "", thighCm: "", notes: "" });

export function ProgressFormSheet({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSaved?: (record: ProgressRecord) => void;
}) {
  const { t } = useI18n();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY() });

  React.useEffect(() => {
    if (open) reset(EMPTY());
  }, [open, reset]);

  const onSubmit = async (v: Values) => {
    const res = await createProgressAction({
      clientId,
      date: v.date,
      weightKg: parseDecimal(v.weightKg),
      bodyFatPct: parseDecimal(v.bodyFatPct),
      waistCm: parseDecimal(v.waistCm),
      hipsCm: parseDecimal(v.hipsCm),
      chestCm: parseDecimal(v.chestCm),
      armCm: parseDecimal(v.armCm),
      thighCm: parseDecimal(v.thighCm),
      notes: v.notes.trim() || null,
    });
    if (!res.ok) return void toast.error(res.error);
    toast.success(t("Progresso registrato"));
    onSaved?.(res.data);
    onOpenChange(false);
  };

  const num = (name: keyof Values, label: string, unit: string, placeholder?: string) => (
    <Field label={`${label} (${unit})`} htmlFor={`p-${name}`} error={errors[name]?.message}>
      <Input id={`p-${name}`} inputMode="decimal" placeholder={placeholder} aria-invalid={!!errors[name]} {...register(name)} />
    </Field>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{t("Registra progresso")}</SheetTitle>
            <SheetDescription>{t("Misurazioni di {clientName}. Compila solo i valori rilevati: i campi vuoti restano vuoti.", { clientName })}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5">
            <Field label={t("Data")} htmlFor="p-date" error={errors.date?.message}>
              <Input id="p-date" type="date" max={todayKey()} className="sm:w-56" {...register("date")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              {num("weightKg", t("Peso"), "kg", t("es. 62,8"))}
              {num("bodyFatPct", t("Massa grassa"), "%", t("es. 24,5"))}
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold">{t("Circonferenze")}</div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {num("waistCm", t("Vita"), "cm")}
                {num("hipsCm", t("Fianchi"), "cm")}
                {num("chestCm", t("Petto"), "cm")}
                {num("armCm", t("Braccio"), "cm")}
                {num("thighCm", t("Coscia"), "cm")}
              </div>
            </div>
            <Field label={t("Note")} htmlFor="p-notes" error={errors.notes?.message} optional>
              <Textarea id="p-notes" rows={3} placeholder={t("Sensazioni, aderenza, condizioni della misurazione…")} {...register("notes")} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              
              {t("Annulla")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              
              {t("Salva misurazioni")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
