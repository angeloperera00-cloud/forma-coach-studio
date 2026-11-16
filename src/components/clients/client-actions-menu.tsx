"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Dumbbell, MoreHorizontal, Pause, Pencil, Play, Salad, Trash2, UserRound } from "lucide-react";
import type { Client } from "@/lib/domain/types";
import { deleteClientAction, setClientStatusAction } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menus";
import { useConfirm } from "@/components/common/confirm";
import type { ClientStatus } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";

export function ClientActionsMenu({
  client,
  onEdit,
  showOpen = true,
  trigger,
  afterDelete,
}: {
  client: Client;
  onEdit: () => void;
  showOpen?: boolean;
  trigger?: React.ReactNode;
  afterDelete?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();
  const name = `${client.firstName} ${client.lastName}`;

  const setStatus = async (status: ClientStatus, message: string) => {
    const res = await setClientStatusAction(client.id, status);
    if (res.ok) toast.success(message);
    else toast.error(res.error);
  };

  const remove = async () => {
    const ok = await confirm({
      title: t("Eliminare {name}?", { name }),
      description: t("Verranno eliminati definitivamente anche schede, piani alimentari, progressi, note e appuntamenti di questo cliente. L'operazione non può essere annullata."),
      confirmLabel: t("Elimina cliente"),
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteClientAction(client.id);
    if (!res.ok) return void toast.error(res.error);
    toast.success(t("{name} è stato eliminato", { name }));
    if (afterDelete) afterDelete();
    else router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label={t("Azioni per {name}", { name })}>
            <MoreHorizontal />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        {showOpen && (
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}`}>
              <UserRound /> {t("Apri profilo")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil /> {t("Modifica dati")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/workouts/new?client=${client.id}`}>
            <Dumbbell /> {t("Nuova scheda")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/nutrition/new?client=${client.id}`}>
            <Salad /> {t("Nuovo piano alimentare")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {client.status === "active" && (
          <DropdownMenuItem onSelect={() => setStatus("paused", t("{name} è in pausa", { name }))}>
            <Pause /> {t("Metti in pausa")}
          </DropdownMenuItem>
        )}
        {client.status !== "active" && (
          <DropdownMenuItem onSelect={() => setStatus("active", t("{name} è di nuovo attivo", { name }))}>
            <Play /> {t("Riattiva")}
          </DropdownMenuItem>
        )}
        {client.status !== "archived" ? (
          <DropdownMenuItem onSelect={() => setStatus("archived", t("{name} è stato archiviato", { name }))}>
            <Archive /> {t("Archivia")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => setStatus("paused", t("{name} è stato ripristinato", { name }))}>
            <ArchiveRestore /> {t("Ripristina dall'archivio")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={remove}>
          <Trash2 /> {t("Elimina cliente")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
