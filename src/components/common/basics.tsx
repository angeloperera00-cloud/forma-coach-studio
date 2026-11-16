"use client";

import * as React from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ClientStatus, PlanStatus } from "@/lib/domain/constants";
import { CLIENT_STATUS_LABELS, NUTRITION_STATUS_LABELS, WORKOUT_STATUS_LABELS } from "@/lib/domain/constants";
import { useI18n } from "@/lib/i18n/client";

/* ------------------------------- Panel card ------------------------------- */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-3xl border bg-card shadow-card", className)} {...props} />;
}

export function PanelHeader({ title, description, actions, className, icon }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string; icon?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-3 md:px-6", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------- Empty state ------------------------------ */
export function EmptyState({
  emoji,
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  emoji?: string;
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14", className)}>
      {emoji ? (
        <Image src={`/emoji/${emoji}.png`} alt="" width={compact ? 44 : 64} height={compact ? 44 : 64} className="drop-shadow-sm" />
      ) : (
        icon && <div className="grid size-14 place-items-center rounded-2xl bg-pale text-forest [&_svg]:size-6">{icon}</div>
      )}
      <div className="max-w-sm">
        <h3 className={cn("font-semibold tracking-tight", compact ? "text-[14.5px]" : "text-[16px]")}>{title}</h3>
        {description && <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ------------------------------ Status badges ----------------------------- */
export function PlanStatusBadge({ status, kind, size }: { status: PlanStatus; kind: "workout" | "nutrition"; size?: "sm" | "default" }) {
  const { t } = useI18n();
  const label = t((kind === "workout" ? WORKOUT_STATUS_LABELS : NUTRITION_STATUS_LABELS)[status]);
  const variant = status === "published" ? "success" : status === "draft" ? "warning" : "neutral";
  return (
    <Badge variant={variant} size={size} dot>
      {label}
    </Badge>
  );
}

export function ClientStatusBadge({ status, size }: { status: ClientStatus; size?: "sm" | "default" }) {
  const { t } = useI18n();
  const variant = status === "active" ? "success" : status === "paused" ? "warning" : "neutral";
  return (
    <Badge variant={variant} size={size} dot>
      {t(CLIENT_STATUS_LABELS[status])}
    </Badge>
  );
}

/* ---------------------------------- Thumb --------------------------------- */
/** Rounded media square. Local assets are optimized; uploaded/remote images are served as-is. */
export function Thumb({
  src,
  alt = "",
  size,
  className,
  contain,
  sizes = "96px",
  priority,
}: {
  src: string | null | undefined;
  alt?: string;
  size?: number;
  className?: string;
  contain?: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  const style = size ? { width: size, height: size } : undefined;
  if (!src)
    return (
      <div className={cn("grid shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground", className)} style={style} aria-hidden>
        <ImageIcon className="size-1/3 min-h-4 min-w-4" />
      </div>
    );
  const optimizable = src.startsWith("/") && !src.startsWith("/api/");
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-muted", contain && "bg-tile", className)} style={style}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!optimizable} className={contain ? "object-contain p-[12%]" : "object-cover"} />
    </div>
  );
}

/* ---------------------------------- Stat ---------------------------------- */
export function StatTile({ label, value, hint, icon, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3.5 rounded-2xl border bg-card p-4 shadow-card", className)}>
      {icon && <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-pale text-forest [&_svg]:size-5">{icon}</div>}
      <div className="min-w-0">
        <div className="line-clamp-2 text-[12.5px] leading-tight font-medium text-muted-foreground sm:truncate">{label}</div>
        <div className="text-[22px] leading-tight font-semibold tracking-tight tabular">{value}</div>
        {hint && <div className="truncate text-[12px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
