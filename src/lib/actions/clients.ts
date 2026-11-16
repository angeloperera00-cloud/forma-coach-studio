"use server";

import { z } from "zod";
import { getRepository, NotFoundError } from "@/lib/data";
import { clientInput, clientNoteInput, idSchema } from "@/lib/domain/schemas";
import { CLIENT_STATUSES } from "@/lib/domain/constants";
import type { Client, ClientNote } from "@/lib/domain/types";
import { handle, logActivity, refreshAll, touch, type ActionResult } from "./utils";
import { msg } from "@/lib/i18n/core";

export async function createClientAction(raw: unknown): Promise<ActionResult<Client>> {
  return handle(async () => {
    const input = clientInput.parse(raw);
    const client = await getRepository().createClient(input);
    await logActivity({
      type: "client_created",
      clientId: client.id,
      title: msg("Nuovo cliente"),
      description: "{client} è stato aggiunto ai clienti",
      params: { client: `${client.firstName} ${client.lastName}` },
      href: `/clients/${client.id}`,
    });
    refreshAll();
    return client;
  });
}

export async function updateClientAction(id: unknown, raw: unknown): Promise<ActionResult<Client>> {
  return handle(async () => {
    const clientId = idSchema.parse(id);
    const input = clientInput.parse(raw);
    const client = await getRepository().updateClient(clientId, input);
    refreshAll();
    return client;
  });
}

export async function setClientStatusAction(id: unknown, status: unknown): Promise<ActionResult<Client>> {
  return handle(async () => {
    const client = await getRepository().updateClient(idSchema.parse(id), { status: z.enum(CLIENT_STATUSES).parse(status) });
    refreshAll();
    return client;
  });
}

export async function deleteClientAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    const clientId = idSchema.parse(id);
    const repo = getRepository();
    if (!(await repo.getClient(clientId))) throw new NotFoundError(msg("Cliente non trovato"));
    await repo.deleteClient(clientId);
    refreshAll();
    return null;
  });
}

export async function addClientNoteAction(raw: unknown): Promise<ActionResult<ClientNote>> {
  return handle(async () => {
    const { clientId, body } = clientNoteInput.parse(raw);
    const repo = getRepository();
    const client = await repo.getClient(clientId);
    if (!client) throw new NotFoundError(msg("Cliente non trovato"));
    const note = await repo.createClientNote(clientId, body);
    await logActivity({
      type: "note_added",
      clientId,
      title: msg("Nota aggiunta"),
      description: "{client}: {excerpt}",
      params: { client: `${client.firstName} ${client.lastName}`, excerpt: body.length > 70 ? `${body.slice(0, 70)}…` : body },
      href: `/clients/${clientId}?tab=note`,
    });
    await touch(clientId);
    refreshAll();
    return note;
  });
}

export async function deleteClientNoteAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteClientNote(idSchema.parse(id));
    refreshAll();
    return null;
  });
}
