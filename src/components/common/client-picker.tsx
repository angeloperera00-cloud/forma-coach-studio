"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, UserPlus } from "lucide-react";
import type { ClientOption } from "@/lib/domain/types";
import { GOAL_LABELS } from "@/lib/domain/constants";
import { cn, matches } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useTouchDevice } from "@/lib/hooks/use-touch";
import { msg } from "@/lib/i18n/core";

export function planStatusSummary(c: ClientOption): { label: string; variant: "success" | "warning" | "neutral" } {
  const w = c.workout?.status;
  const n = c.nutrition?.status;
  if (w === "published" && n === "published") return { label: msg("Scheda e piano attivi"), variant: "success" };
  if (w === "published") return { label: n === "draft" ? msg("Scheda attiva · piano in bozza") : msg("Scheda attiva"), variant: "success" };
  if (n === "published") return { label: w === "draft" ? msg("Piano attivo · scheda in bozza") : msg("Piano attivo"), variant: "success" };
  if (w === "draft" || n === "draft") return { label: msg("Bozza in corso"), variant: "warning" };
  return { label: msg("Nessun piano"), variant: "neutral" };
}

interface ClientPickerProps {
  clients: ClientOption[];
  value: string | null;
  onChange: (id: string) => void;
  /** card = big tappable card like the iPhone reference; field = compact form control */
  variant?: "card" | "field";
  label?: string;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
  id?: string;
  showArchived?: boolean;
}

export function ClientPicker({ clients, value, onChange, variant = "card", label, placeholder, className, invalid, id, showArchived }: ClientPickerProps) {
  const touch = useTouchDevice();
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLUListElement>(null);
  const selected = clients.find((c) => c.id === value) ?? null;

  const visible = React.useMemo(
    () =>
      clients
        .filter((c) => showArchived || c.status !== "archived" || c.id === value)
        .filter((c) => matches(`${c.firstName} ${c.lastName} ${t(GOAL_LABELS[c.goal])}`, query)),
    [clients, query, showArchived, value, t],
  );

  // Reset the highlighted row when the query changes or the list opens.
  const resetKey = `${open}|${query}`;
  const [prevResetKey, setPrevResetKey] = React.useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setActive(0);
  }
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (cid: string) => {
    onChange(cid);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(visible.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && visible[active]) {
      e.preventDefault();
      choose(visible[active].id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid || undefined}
          className={cn(
            "group flex w-full min-w-0 items-center gap-3 text-left outline-none transition-[border-color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[invalid]:border-destructive/70",
            variant === "card"
              ? "rounded-2xl border bg-card p-3 pr-4 shadow-card hover:border-border-strong data-[state=open]:border-primary/40"
              : "h-10 rounded-xl border border-input bg-card px-2.5 hover:border-border-strong",
            className,
          )}
        >
          {selected ? (
            <Avatar src={selected.avatarUrl} name={`${selected.firstName} ${selected.lastName}`} size={variant === "card" ? 44 : 26} />
          ) : (
            <span className={cn("grid shrink-0 place-items-center rounded-full bg-muted text-muted-foreground", variant === "card" ? "size-11" : "size-[26px]")}>
              <UserPlus className="size-4" />
            </span>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            {variant === "card" && <div className="text-[12.5px] font-medium text-muted-foreground">{label ?? t("Cliente")}</div>}
            <div className={cn("truncate font-semibold", variant === "card" ? "text-[16px]" : "text-[14px] font-medium", !selected && "font-medium text-muted-foreground")}>
              {selected ? `${selected.firstName} ${selected.lastName}` : (placeholder ?? t("Seleziona un cliente"))}
            </div>
          </div>
          <ChevronDown className="size-[18px] shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(420px,calc(100vw-1.5rem))] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex items-center gap-2.5 border-b px-3.5">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus={!touch}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("Cerca per nome o obiettivo…")}
            className="h-11 w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded
            aria-controls="client-picker-list"
            aria-activedescendant={visible[active] ? `client-opt-${visible[active].id}` : undefined}
          />
        </div>
        <ul ref={listRef} id="client-picker-list" role="listbox" className="scrollbar-thin max-h-80 overflow-y-auto p-1.5">
          {visible.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted-foreground">{t("Nessun cliente trovato")}</li>}
          {visible.map((c, i) => {
            const status = planStatusSummary(c);
            const isSelected = c.id === value;
            return (
              <li
                key={c.id}
                id={`client-opt-${c.id}`}
                role="option"
                aria-selected={isSelected}
                data-index={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(c.id)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2", i === active && "bg-muted")}
              >
                <Avatar src={c.avatarUrl} name={`${c.firstName} ${c.lastName}`} size={38} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center gap-1.5 truncate text-[14px] font-semibold">
                    {c.firstName} {c.lastName}
                    {c.status !== "active" && <span className="text-[11.5px] font-medium text-muted-foreground">· {c.status === "paused" ? t("in pausa") : "archiviato"}</span>}
                  </div>
                  <div className="truncate text-[12.5px] text-muted-foreground">{t(GOAL_LABELS[c.goal])}</div>
                </div>
                <Badge variant={status.variant} size="sm" className="max-sm:hidden">
                  {t(status.label)}
                </Badge>
                {isSelected && <Check className="size-4 shrink-0 text-primary" />}
              </li>
            );
          })}
        </ul>
        <div className="border-t p-1.5">
          <Link href="/clients?new=1" className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13.5px] font-medium text-primary hover:bg-pale">
            <UserPlus className="size-4" /> {t("Nuovo cliente")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
