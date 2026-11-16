"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Apple, Dumbbell, Plus, Salad, UserPlus, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/overlays";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Avatar } from "@/components/ui/misc";
import { getSearchIndexAction } from "@/lib/actions/account";
import type { SearchItem } from "@/lib/domain/types";
import { ALL_NAV_ITEMS } from "./nav";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

const GROUPS: { key: SearchItem["group"]; label: string }[] = [
  { key: "clients", label: msg("Clienti") },
  { key: "workouts", label: msg("Schede di allenamento") },
  { key: "nutrition", label: msg("Piani alimentari") },
  { key: "exercises", label: msg("Esercizi") },
  { key: "foods", label: msg("Alimenti e ricette") },
];

const QUICK_ACTIONS = [
  { label: msg("Nuovo cliente"), href: "/clients?new=1", icon: UserPlus },
  { label: msg("Nuova scheda di allenamento"), href: "/workouts/new", icon: Dumbbell },
  { label: msg("Nuovo piano alimentare"), href: "/nutrition/new", icon: Salad },
];

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = React.useState<SearchItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getSearchIndexAction().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setItems(res.data);
        setError(null);
      } else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="top-[12dvh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{t("Cerca")}</DialogTitle>
        <DialogDescription className="sr-only">{t("Cerca clienti, schede, piani, esercizi e alimenti")}</DialogDescription>
        <Command loop>
          <CommandInput placeholder={t("Cerca clienti, schede, esercizi, alimenti…")} autoFocus />
          <CommandList>
            <CommandEmpty>{error ?? (items ? t("Nessun risultato") : t("Caricamento…"))}</CommandEmpty>
            <CommandGroup heading={t("Azioni rapide")}>
              {QUICK_ACTIONS.map((a) => (
                <CommandItem key={a.href} value={`azione ${t(a.label)}`} onSelect={() => go(a.href)}>
                  <span className="grid size-8 place-items-center rounded-lg bg-pale text-forest">
                    <a.icon />
                  </span>
                  {t(a.label)}
                  <Plus className="ml-auto text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={t("Vai a")}>
              {ALL_NAV_ITEMS.map((n) => (
                <CommandItem key={n.href} value={`pagina ${t(n.label)}`} onSelect={() => go(n.href)}>
                  <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <n.icon />
                  </span>
                  {t(n.label)}
                </CommandItem>
              ))}
            </CommandGroup>
            {items && <CommandSeparator />}
            {items &&
              GROUPS.map((g) => {
                const list = items.filter((i) => i.group === g.key);
                if (!list.length) return null;
                return (
                  <CommandGroup key={g.key} heading={t(g.label)}>
                    {list.map((item) => (
                      <CommandItem key={`${g.key}-${item.id}`} value={`${item.title} ${item.subtitle} ${g.key}-${item.id}`} onSelect={() => go(item.href)}>
                        <ResultVisual item={item} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{item.title}</div>
                          {item.subtitle && <div className="truncate text-[12px] text-muted-foreground">{item.subtitle}</div>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function ResultVisual({ item }: { item: SearchItem }) {
  if (item.group === "clients") return <Avatar src={item.image} name={item.title} size={32} />;
  if (item.image)
    return (
      <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted">
        <Image src={item.image} alt="" fill sizes="32px" className={item.group === "foods" ? "object-contain p-0.5" : "object-cover"} unoptimized={!item.image.startsWith("/")} />
      </span>
    );
  const Icon = item.group === "workouts" ? Dumbbell : item.group === "nutrition" ? Salad : item.group === "foods" ? Apple : Users;
  return (
    <span className="grid size-8 place-items-center rounded-lg bg-pale text-forest">
      <Icon />
    </span>
  );
}
