"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useShell, AccountMenuContent } from "./shell";
import { Avatar, Kbd } from "@/components/ui/misc";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/menus";
import { Button } from "@/components/ui/button";
import { ActivityIcon } from "@/components/common/activity-icon";
import { RelativeTime } from "@/components/common/relative-time";
import { markActivityAction } from "@/lib/actions/account";
import { useI18n } from "@/lib/i18n/client";
import { activityText } from "@/lib/i18n/activity";

export interface Crumb {
  label: string;
  href?: string;
}

interface TopbarProps {
  title: string;
  breadcrumbs?: Crumb[];
  /** Contextual primary action(s), right side */
  actions?: React.ReactNode;
  /** Mobile back link (editors) */
  backHref?: string;
  /** Hide the title on mobile (dashboard greeting replaces it) */
  mobileTitleHidden?: boolean;
  /** Extra mobile-only action (e.g. the green "Esporta" button on editors) */
  mobileActions?: React.ReactNode;
  /** Icon-only search (editors need the room for their actions) */
  compactSearch?: boolean;
}

const noopSubscribe = () => () => {};

export function Topbar({ title, breadcrumbs = [], actions, backHref, mobileTitleHidden, mobileActions, compactSearch }: TopbarProps) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-topbar
      className={cn(
        "sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl transition-[border-color,box-shadow] duration-200 supports-[backdrop-filter]:bg-background/72",
        scrolled ? "border-border shadow-[0_1px_0_rgb(18_62_48/0.02)]" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-[60px] w-full max-w-[1480px] items-center gap-2 px-4 md:h-16 md:gap-3 md:px-6 xl:px-8">
        {backHref && (
          <Button asChild variant="ghost" size="icon" className="-ml-2 md:hidden">
            <Link href={backHref} aria-label={t("Indietro")}>
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
        )}
        <div className={cn("min-w-0 flex-1", backHref && "text-center md:text-left")}>
          {breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
          <h1 className={cn("truncate text-[16px] font-semibold tracking-tight min-[400px]:text-[17px] md:text-[19px]", mobileTitleHidden && "max-md:hidden")}>{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <SearchTrigger compact={compactSearch} />
          <NotificationBell />
          {mobileActions && <div className="md:hidden">{mobileActions}</div>}
          {actions && <div className={cn("flex items-center gap-2", mobileActions && "max-md:hidden")}>{actions}</div>}
          {/* On phones the account, settings and logout live in the "Altro" sheet. */}
          <div className="max-md:hidden">
            <AccountButton />
          </div>
        </div>
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t("Percorso")} className="mb-0.5 hidden md:block">
      <ol className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
        <li>
          <Link href="/" className="rounded transition-colors hover:text-foreground">
            
            {t("Home")}
          </Link>
        </li>
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1">
            <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
            {c.href && i < items.length - 1 ? (
              <Link href={c.href} className="truncate rounded transition-colors hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="truncate" aria-current={i === items.length - 1 ? "page" : undefined}>
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SearchTrigger({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const { openSearch } = useShell();
  const mac = React.useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(navigator.userAgent),
    () => true,
  );
  return (
    <>
      <button
        onClick={openSearch}
        className={cn(
          "hidden h-10 w-56 items-center gap-2.5 rounded-xl border border-input bg-card px-3 text-[13.5px] text-muted-foreground shadow-[0_1px_1px_rgb(18_62_48/0.03)] transition-colors hover:border-border-strong hover:text-foreground xl:w-64",
          !compact && "lg:flex",
        )}
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">{t("Cerca…")}</span>
        <span className="flex items-center gap-0.5">
          <Kbd>{mac ? "⌘" : t("Ctrl")}</Kbd>
          <Kbd>{t("K")}</Kbd>
        </span>
      </button>
      <Button variant="ghost" size="icon" onClick={openSearch} className={cn(!compact && "lg:hidden")} aria-label={t("Cerca")}>
        <Search className="size-[19px]" />
      </Button>
    </>
  );
}

function NotificationBell() {
  const i18n = useI18n();
  const { t, tn } = i18n;
  const { unreadCount, notifications } = useShell();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const markAll = () =>
    startTransition(async () => {
      const res = await markActivityAction("all", true);
      if (!res.ok) toast.error(res.error);
    });

  const openItem = (id: string, href: string | null, read: boolean) => {
    setOpen(false);
    if (!read) startTransition(async () => void (await markActivityAction([id], true)));
    if (href) router.push(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount ? tn("Notifiche, {n} non letta", "Notifiche, {n} non lette", unreadCount) : t("Notifiche")}>
          <Bell className="size-[19px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-background tabular">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(380px,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-[14.5px] font-semibold">{t("Notifiche")}</div>
            <div className="text-[12px] text-muted-foreground">{unreadCount ? tn("{n} da leggere", "{n} da leggere", unreadCount) : t("Tutto letto")}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={markAll} disabled={!unreadCount} loading={pending}>
            <CheckCheck /> {t("Segna come lette")}
          </Button>
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
            <BellOff className="size-6" />
            {t("Nessuna notifica")}
          </div>
        ) : (
          <ul className="scrollbar-thin max-h-[420px] overflow-y-auto p-1.5">
            {notifications.map((n) => {
              const text = activityText(n, i18n);
              return (
              <li key={n.id}>
                <button
                  onClick={() => openItem(n.id, n.href, n.readAt !== null)}
                  className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <ActivityIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("truncate text-[13.5px]", n.readAt ? "font-medium" : "font-semibold")}>{text.title}</span>
                      {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={t("Non letta")} />}
                    </div>
                    {text.description && <p className="line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{text.description}</p>}
                    <RelativeTime date={n.createdAt} className="text-[11.5px] text-muted-foreground/80" />
                  </div>
                </button>
              </li>
              );
            })}
          </ul>
        )}
        <div className="border-t p-1.5">
          <Button asChild variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            <Link href="/notifications">{t("Vedi tutte le notifiche")}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AccountButton() {
  const { t } = useI18n();
  const { coach, mode } = useShell();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30" aria-label={t("Account")}>
        <Avatar src={coach.avatarUrl} name={coach.fullName} size={36} />
      </DropdownMenuTrigger>
      <AccountMenuContent coach={coach} mode={mode} />
    </DropdownMenu>
  );
}

/** Standard page content container below the topbar. */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main id="main" className={cn("mx-auto w-full max-w-[1480px] flex-1 px-4 pt-3 pb-28 md:px-6 md:pt-5 md:pb-12 xl:px-8", className)}>
      {children}
    </main>
  );
}
