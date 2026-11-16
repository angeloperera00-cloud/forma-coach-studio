"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/domain/types";
import { CLIENT_STATUSES, CLIENT_STATUS_LABELS, GENDERS, GENDER_LABELS, GOALS, GOAL_LABELS } from "@/lib/domain/constants";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/overlays";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Segmented } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/common/image-upload";
import { parseDecimal } from "@/lib/utils";
import { todayKey } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

const optionalNumber = (min: number, max: number, message: string) =>
  z.string().refine((v) => {
    const n = parseDecimal(v);
    return n === null || (!Number.isNaN(n) && n >= min && n <= max);
  }, message);

const formSchema = z.object({
  firstName: z.string().trim().min(1, msg("Inserisci il nome")).max(60, msg("Massimo 60 caratteri")),
  lastName: z.string().trim().min(1, msg("Inserisci il cognome")).max(60, msg("Massimo 60 caratteri")),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, msg("Email non valida")),
  phone: z.string().trim().max(30, msg("Massimo 30 caratteri")),
  birthDate: z.string().refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v <= todayKey()), msg("Data di nascita non valida")),
  gender: z.enum([...GENDERS, ""]),
  heightCm: optionalNumber(80, 250, msg("Altezza tra 80 e 250 cm")),
  goal: z.enum(GOALS, msg("Seleziona un obiettivo")),
  goalDetails: z.string().trim().max(600, msg("Massimo 600 caratteri")),
  status: z.enum(CLIENT_STATUSES),
  avatarUrl: z.string().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("Data non valida")),
});
type FormValues = z.infer<typeof formSchema>;

function defaults(client?: Client | null): FormValues {
  return {
    firstName: client?.firstName ?? "",
    lastName: client?.lastName ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    birthDate: client?.birthDate ?? "",
    gender: client?.gender ?? "",
    heightCm: client?.heightCm != null ? String(client.heightCm).replace(".", ",") : "",
    goal: client?.goal ?? "recomposition",
    goalDetails: client?.goalDetails ?? "",
    status: client?.status ?? "active",
    avatarUrl: client?.avatarUrl ?? null,
    startDate: client?.startDate ?? todayKey(),
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSaved?: (client: Client) => void;
}

export function ClientFormSheet({ open, onOpenChange, client, onSaved }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const editing = Boolean(client);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults(client) });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset(defaults(client));
  }, [open, client, reset]);

  const onSubmit = async (v: FormValues) => {
    const payload = {
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email || null,
      phone: v.phone || null,
      birthDate: v.birthDate || null,
      gender: v.gender || null,
      heightCm: parseDecimal(v.heightCm),
      goal: v.goal,
      goalDetails: v.goalDetails || null,
      status: v.status,
      avatarUrl: v.avatarUrl,
      startDate: v.startDate,
    };
    const res = client ? await updateClientAction(client.id, payload) : await createClientAction(payload);
    if (!res.ok) {
      for (const [path, message] of Object.entries(res.fieldErrors ?? {})) {
        if (path in v) setError(path as keyof FormValues, { message });
      }
      toast.error(res.error);
      return;
    }
    toast.success(editing ? t("Cliente aggiornato") : t("{firstName} è stato aggiunto ai clienti", { firstName: res.data.firstName }));
    onOpenChange(false);
    onSaved?.(res.data);
    if (!editing && !onSaved) router.push(`/clients/${res.data.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-[560px]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{editing ? t("Modifica cliente") : t("Nuovo cliente")}</SheetTitle>
            <SheetDescription>{editing ? t("Aggiorna i dati e gli obiettivi del cliente.") : t("Aggiungi un cliente per creare schede e piani dedicati.")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5">
            <Controller
              control={control}
              name="avatarUrl"
              render={({ field }) => <ImageUpload value={field.value} onChange={field.onChange} folder="avatars" shape="circle" label={t("Carica foto profilo")} />}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Nome")} htmlFor="firstName" error={errors.firstName?.message}>
                <Input id="firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} {...register("firstName")} />
              </Field>
              <Field label={t("Cognome")} htmlFor="lastName" error={errors.lastName?.message}>
                <Input id="lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} {...register("lastName")} />
              </Field>
              <Field label={t("Email")} htmlFor="email" error={errors.email?.message} optional>
                <Input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
              </Field>
              <Field label={t("Telefono")} htmlFor="phone" error={errors.phone?.message} optional>
                <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
              </Field>
              <Field label={t("Data di nascita")} htmlFor="birthDate" error={errors.birthDate?.message} optional>
                <Input id="birthDate" type="date" max={todayKey()} aria-invalid={!!errors.birthDate} {...register("birthDate")} />
              </Field>
              <Field label={t("Sesso")} htmlFor="gender" optional>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <Select
                      id="gender"
                      value={field.value || null}
                      onValueChange={field.onChange}
                      placeholder={t("Non specificato")}
                      options={GENDERS.map((g) => ({ value: g, label: t(GENDER_LABELS[g]) }))}
                    />
                  )}
                />
              </Field>
              <Field label={t("Altezza (cm)")} htmlFor="heightCm" error={errors.heightCm?.message} optional>
                <Input id="heightCm" inputMode="decimal" placeholder={t("es. 170")} aria-invalid={!!errors.heightCm} {...register("heightCm")} />
              </Field>
              <Field label={t("Cliente dal")} htmlFor="startDate" error={errors.startDate?.message}>
                <Input id="startDate" type="date" aria-invalid={!!errors.startDate} {...register("startDate")} />
              </Field>
            </div>
            <Field label={t("Obiettivo principale")} htmlFor="goal" error={errors.goal?.message}>
              <Controller
                control={control}
                name="goal"
                render={({ field }) => (
                  <Select id="goal" value={field.value} onValueChange={field.onChange} options={GOALS.map((g) => ({ value: g, label: t(GOAL_LABELS[g]) }))} />
                )}
              />
            </Field>
            <Field label={t("Dettagli obiettivo")} htmlFor="goalDetails" error={errors.goalDetails?.message} optional>
              <Textarea id="goalDetails" rows={3} placeholder={t("Es. Perdere 5 kg mantenendo la forza entro giugno")} {...register("goalDetails")} />
            </Field>
            <Field label={t("Stato")}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Segmented
                    aria-label={t("Stato cliente")}
                    value={field.value}
                    onValueChange={field.onChange}
                    options={CLIENT_STATUSES.map((s) => ({ value: s, label: t(CLIENT_STATUS_LABELS[s]) }))}
                    className="self-start"
                  />
                )}
              />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              
              {t("Annulla")}
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editing ? t("Salva modifiche") : t("Aggiungi cliente")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
