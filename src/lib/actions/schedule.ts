"use server";

import { z } from "zod";
import { getRepository, NotFoundError } from "@/lib/data";
import { appointmentInput, idSchema, progressInput } from "@/lib/domain/schemas";
import { APPOINTMENT_STATUSES } from "@/lib/domain/constants";
import type { Appointment, ProgressRecord } from "@/lib/domain/types";
import { dayKeyOf } from "@/lib/datetime";
import { msg } from "@/lib/i18n/core";
import { handle, logActivity, refreshAll, touch, type ActionResult } from "./utils";

/* --------------------------------- progress -------------------------------- */
export async function createProgressAction(raw: unknown): Promise<ActionResult<ProgressRecord>> {
  return handle(async () => {
    const input = progressInput.parse(raw);
    const repo = getRepository();
    const client = await repo.getClient(input.clientId);
    if (!client) throw new NotFoundError(msg("Cliente non trovato"));
    const record = await repo.createProgress(input);
    await logActivity({
      type: "progress_logged",
      clientId: client.id,
      title: msg("Progresso registrato"),
      description: input.weightKg !== null ? "{client} · {weight} kg" : "{client} · nuove misure",
      params: { client: `${client.firstName} ${client.lastName}`, ...(input.weightKg !== null ? { weight: input.weightKg } : {}) },
      href: `/clients/${client.id}?tab=progressi`,
    });
    await touch(client.id);
    refreshAll();
    return record;
  });
}

export async function deleteProgressAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteProgress(idSchema.parse(id));
    refreshAll();
    return null;
  });
}

/* ------------------------------- appointments ------------------------------ */
export async function saveAppointmentAction(id: unknown, raw: unknown): Promise<ActionResult<Appointment>> {
  return handle(async () => {
    const input = appointmentInput.parse(raw);
    const repo = getRepository();
    const client = input.clientId ? await repo.getClient(input.clientId) : null;
    if (input.clientId && !client) throw new NotFoundError(msg("Cliente non trovato"));
    const appointment = id ? await repo.updateAppointment(idSchema.parse(id), input) : await repo.createAppointment(input);
    if (!id) {
      await logActivity({
        type: "appointment_scheduled",
        clientId: input.clientId,
        title: msg("Appuntamento programmato"),
        description: client ? "{title} con {client} · {when} alle {time}" : "{title} · {when} alle {time}",
        params: { title: appointment.title, startsAt: appointment.startsAt, ...(client ? { client: `${client.firstName} ${client.lastName}` } : {}) },
        href: `/calendar?date=${dayKeyOf(appointment.startsAt)}`,
      });
    }
    await touch(input.clientId);
    refreshAll();
    return appointment;
  });
}

export async function setAppointmentStatusAction(id: unknown, status: unknown): Promise<ActionResult> {
  return handle(async () => {
    const repo = getRepository();
    const appointmentId = idSchema.parse(id);
    const list = await repo.listAppointments();
    const current = list.find((a) => a.id === appointmentId);
    if (!current) throw new NotFoundError(msg("Appuntamento non trovato"));
    await repo.updateAppointment(appointmentId, { ...current, status: z.enum(APPOINTMENT_STATUSES).parse(status) });
    refreshAll();
    return null;
  });
}

export async function deleteAppointmentAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteAppointment(idSchema.parse(id));
    refreshAll();
    return null;
  });
}
