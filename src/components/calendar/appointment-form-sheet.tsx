"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Appointment, ClientOption } from "@/lib/domain/types";
import { APPOINTMENT_STATUSES, APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPES, APPOINTMENT_TYPE_LABELS } from "@/lib/domain/constants";
import { deleteAppointmentAction, saveAppointmentAction } from "@/lib/actions/schedule";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/overlays";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Segmented } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ClientPicker } from "@/components/common/client-picker";
import { useConfirm } from "@/components/common/confirm";
import { dayKeyOf, timeOf, todayKey, zonedToUtc } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

const schema = z.object({
  clientId: z.string().nullable(),
  title: z.string().trim().min(1, msg("Inserisci un titolo")).max(100, msg("Massimo 100 caratteri")),
  type: z.enum(APPOINTMENT_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg("Data non valida")),
  time: z.string().regex(/^\d{2}:\d{2}$/, msg("Ora non valida")),
  durationMinutes: z.string().refine((v) => /^\d{1,3}$/.test(v) && Number(v) >= 5 && Number(v) <= 600, msg("Durata tra 5 e 600 minuti")),
  location: z.string().trim().max(120, msg("Massimo 120 caratteri")),
  notes: z.string().trim().max(1000, msg("Massimo 1000 caratteri")),
  status: z.enum(APPOINTMENT_STATUSES),
});
type Values = z.infer<typeof schema>;

const TITLE_FOR_TYPE: Record<(typeof APPOINTMENT_TYPES)[number], string> = {
  training: msg("Allenamento"),
  check_in: msg("Check-in"),
  video_call: msg("Videochiamata"),
  assessment: msg("Valutazione"),
};

function defaults(a?: Appointment | null, date?: string, clientId?: string | null, title = "Allenamento"): Values {
  if (a)
    return {
      clientId: a.clientId,
      title: a.title,
      type: a.type,
      date: dayKeyOf(a.startsAt),
      time: timeOf(a.startsAt),
      durationMinutes: String(a.durationMinutes),
      location: a.location ?? "",
      notes: a.notes ?? "",
      status: a.status,
    };
  return { clientId: clientId ?? null, title, type: "training", date: date ?? todayKey(), time: "18:00", durationMinutes: "60", location: "", notes: "", status: "scheduled" };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  clients: ClientOption[];
  defaultDate?: string;
  defaultClientId?: string | null;
}

export function AppointmentFormSheet({ open, onOpenChange, appointment, clients, defaultDate, defaultClientId }: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const editing = Boolean(appointment);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(appointment, defaultDate, defaultClientId, t("Allenamento")) });

  React.useEffect(() => {
    if (open) reset(defaults(appointment, defaultDate, defaultClientId, t("Allenamento")));
  }, [open, appointment, defaultDate, defaultClientId, reset, t]);

  const type = watch("type");
  React.useEffect(() => {
    // Keep the default title in sync with the type until the coach edits it.
    if (!editing && !dirtyFields.title && Object.values(TITLE_FOR_TYPE).map((v) => t(v)).includes(getValues("title"))) setValue("title", t(TITLE_FOR_TYPE[type]));
  }, [type, editing, dirtyFields.title, getValues, setValue, t]);

  const onSubmit = async (v: Values) => {
    const res = await saveAppointmentAction(appointment?.id ?? null, {
      clientId: v.clientId,
      title: v.title,
      type: v.type,
      startsAt: zonedToUtc(v.date, v.time).toISOString(),
      durationMinutes: Number(v.durationMinutes),
      location: v.location || null,
      notes: v.notes || null,
      status: v.status,
    });
    if (!res.ok) return void toast.error(res.error);
    toast.success(editing ? t("Appuntamento aggiornato") : t("Appuntamento programmato"));
    onOpenChange(false);
  };

  const remove = async () => {
    if (!appointment) return;
    const ok = await confirm({ title: t("Eliminare l'appuntamento?"), description: appointment.title, confirmLabel: t("Elimina"), destructive: true });
    if (!ok) return;
    const res = await deleteAppointmentAction(appointment.id);
    if (!res.ok) return void toast.error(res.error);
    toast.success(t("Appuntamento eliminato"));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{editing ? t("Modifica appuntamento") : t("Nuovo appuntamento")}</SheetTitle>
            <SheetDescription>{t("Sessioni, check-in e valutazioni con i tuoi clienti.")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5">
            <Field label={t("Cliente")} optional>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <ClientPicker clients={clients} value={field.value} onChange={field.onChange} variant="field" placeholder={t("Nessun cliente")} />
                    {field.value && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)}>
                        
                        {t("Rimuovi")}
                      </Button>
                    )}
                  </div>
                )}
              />
            </Field>
            <Field label={t("Tipo")}>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Segmented aria-label={t("Tipo di appuntamento")} value={field.value} onValueChange={field.onChange} options={APPOINTMENT_TYPES.map((type) => ({ value: type, label: t(APPOINTMENT_TYPE_LABELS[type]) }))} className="self-start" />
                )}
              />
            </Field>
            <Field label={t("Titolo")} htmlFor="a-title" error={errors.title?.message}>
              <Input id="a-title" aria-invalid={!!errors.title} {...register("title")} />
            </Field>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label={t("Data")} htmlFor="a-date" error={errors.date?.message} className="col-span-2 sm:col-span-1">
                <Input id="a-date" type="date" {...register("date")} />
              </Field>
              <Field label={t("Ora")} htmlFor="a-time" error={errors.time?.message}>
                <Input id="a-time" type="time" step={300} {...register("time")} />
              </Field>
              <Field label={t("Durata (min)")} htmlFor="a-duration" error={errors.durationMinutes?.message}>
                <Input id="a-duration" inputMode="numeric" {...register("durationMinutes")} />
              </Field>
            </div>
            <Field label={t("Luogo o link")} htmlFor="a-location" error={errors.location?.message} optional>
              <Input id="a-location" placeholder={t("Es. Studio · Sala pesi, oppure link videochiamata")} {...register("location")} />
            </Field>
            <Field label={t("Note")} htmlFor="a-notes" error={errors.notes?.message} optional>
              <Textarea id="a-notes" rows={3} {...register("notes")} />
            </Field>
            {editing && (
              <Field label={t("Stato")}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} options={APPOINTMENT_STATUSES.map((s) => ({ value: s, label: t(APPOINTMENT_STATUS_LABELS[s]) }))} className="sm:w-60" />
                  )}
                />
              </Field>
            )}
          </SheetBody>
          <SheetFooter className="justify-between">
            {editing ? (
              <Button type="button" variant="destructive-ghost" onClick={remove}>
                <Trash2 /> {t("Elimina")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                
                {t("Annulla")}
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? t("Salva") : t("Programma")}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
