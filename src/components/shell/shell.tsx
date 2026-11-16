"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Database, Languages, LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { setLocaleAction, signOutAction } from "@/lib/actions/auth";
import type { Activity, DataMode } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { ALL_NAV_ITEMS, NAV_SECTIONS, SETTINGS_ITEM, isActive, isEditorRoute, type NavItem } from "./nav";
import { Brand } from "./brand";
import { GlobalSearch } from "./global-search";
import { Avatar } from "@/components/ui/misc";
import { Tooltip, Sheet, SheetContent, SheetTitle } from "@/components/ui/overlays";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menus";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Button } from "@/components/ui/button";

type SidebarPref = "auto" | "collapsed" | "expanded";

interface ShellValue {
  coach: { fullName: string; avatarUrl: string | null; studioName: string | null; email: string | null };
  mode: DataMode;
  loginEnabled: boolean;
  unreadCount: number;
  notifications: Activity[];
  openSearch: () => void;
}

const ShellContext = React.createContext<ShellValue | null>(null);

export function useShell() {
  const ctx = React.useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside <AppShell>");
  return ctx;
}

export function AppShell({
  children,
  sidebarPref,
  ...value
}: Omit<ShellValue, "openSearch"> & { children: React.ReactNode; sidebarPref: SidebarPref }) {
  const { t } = useI18n();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const openSearch = React.useCallback(() => setSearchOpen(true), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ctx = React.useMemo(() => ({ ...value, openSearch }), [value, openSearch]);

  return (
    <ShellContext.Provider value={ctx}>
      <a
        href="#main"
        className="sr-only z-[60] rounded-lg bg-forest px-3 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("Vai al contenuto")}
      </a>
      <div className="flex min-h-dvh">
        <AppSidebar initialPref={sidebarPref} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <MobileTabBar />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </ShellContext.Provider>
  );
}

/* --------------------------------- Sidebar -------------------------------- */
// Visual collapsed state is pure CSS (no hydration flash); JS only drives behaviour (tooltips, toggle).
// Class names are written out in full so Tailwind can see them.
const hideWhenCollapsed = "group-data-[state=collapsed]/sidebar:hidden group-data-[state=auto]/sidebar:max-lg:hidden";
const showWhenCollapsed = "hidden group-data-[state=collapsed]/sidebar:grid group-data-[state=auto]/sidebar:max-lg:grid";
const headerCollapsed =
  "group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0 group-data-[state=auto]/sidebar:max-lg:justify-center group-data-[state=auto]/sidebar:max-lg:px-0";
const linkCollapsed =
  "group-data-[state=collapsed]/sidebar:mx-auto group-data-[state=collapsed]/sidebar:size-11 group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0 group-data-[state=auto]/sidebar:max-lg:mx-auto group-data-[state=auto]/sidebar:max-lg:size-11 group-data-[state=auto]/sidebar:max-lg:justify-center group-data-[state=auto]/sidebar:max-lg:px-0";
const coachCollapsed =
  "group-data-[state=collapsed]/sidebar:mx-auto group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:p-1.5 group-data-[state=auto]/sidebar:max-lg:mx-auto group-data-[state=auto]/sidebar:max-lg:justify-center group-data-[state=auto]/sidebar:max-lg:p-1.5";

function AppSidebar({ initialPref }: { initialPref: SidebarPref }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { coach, unreadCount, mode } = useShell();
  const [pref, setPref] = React.useState<SidebarPref>(initialPref);
  const isLg = useMediaQuery("(min-width: 1024px)");
  const collapsed = pref === "collapsed" || (pref === "auto" && !isLg);

  const toggle = () => {
    const next: SidebarPref = collapsed ? "expanded" : "collapsed";
    setPref(next);
    document.cookie = `forma-sidebar=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <aside
      data-state={pref}
      aria-label={t("Navigazione principale")}
      className={cn(
        "group/sidebar sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r bg-card transition-[width] duration-200 ease-[var(--ease-soft)] md:flex",
        "data-[state=collapsed]:w-[76px] data-[state=expanded]:w-[244px] 2xl:data-[state=expanded]:w-[256px]",
        "data-[state=auto]:w-[76px] lg:data-[state=auto]:w-[244px] 2xl:data-[state=auto]:w-[256px]",
      )}
    >
      <div className={cn("flex h-16 items-center justify-between px-[21px]", headerCollapsed)}>
        <Link href="/" className="rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30" aria-label={t("Forma — Dashboard")}>
          <Brand compactClassName={hideWhenCollapsed} />
        </Link>
        <Tooltip content={t("Comprimi barra laterale")} side="right">
          <button
            onClick={toggle}
            className={cn("grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", hideWhenCollapsed)}
            aria-label={t("Comprimi barra laterale")}
          >
            <PanelLeftClose className="size-[18px]" />
          </button>
        </Tooltip>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pt-2 pb-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <div className={cn("px-3 pb-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground/80 uppercase", hideWhenCollapsed)}>
              {t(section.label)}
            </div>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.href}>
                  <SidebarLink item={item} active={isActive(pathname, item.href)} collapsed={collapsed} badge={item.badge === "unread" ? unreadCount : 0} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t p-3">
        <SidebarLink item={SETTINGS_ITEM} active={isActive(pathname, SETTINGS_ITEM.href)} collapsed={collapsed} badge={0} />
        <Tooltip content={t("Espandi barra laterale")} side="right">
          <button
            onClick={toggle}
            className={cn("mx-auto size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", showWhenCollapsed)}
            aria-label={t("Espandi barra laterale")}
          >
            <PanelLeftOpen className="size-[18px]" />
          </button>
        </Tooltip>
        <CoachMenu coach={coach} mode={mode} />
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, collapsed, badge }: { item: NavItem; active: boolean; collapsed: boolean; badge: number }) {
  const { t } = useI18n();
  const Icon = item.icon;
  const label = t(item.label);
  return (
    <Tooltip content={label} side="right" disabled={!collapsed}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        className={cn(
          "relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/30",
          linkCollapsed,
          active ? "bg-pale text-forest" : "text-foreground/80 hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className={cn("size-[19px] shrink-0", active ? "text-forest" : "text-muted-foreground")} strokeWidth={active ? 2.2 : 1.9} />
        <span className={cn("truncate", hideWhenCollapsed)}>{label}</span>
        {badge > 0 && (
          <>
            <span className={cn("absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-card", showWhenCollapsed)} />
            <span className={cn("ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white tabular", hideWhenCollapsed)}>
              {badge > 99 ? "99+" : badge}
            </span>
          </>
        )}
      </Link>
    </Tooltip>
  );
}

function CoachMenu({ coach, mode }: { coach: ShellValue["coach"]; mode: DataMode }) {
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-2xl p-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=open]:bg-muted",
          coachCollapsed,
        )}
        aria-label={t("Menu account")}
      >
        <Avatar src={coach.avatarUrl} name={coach.fullName} size={36} />
        <div className={cn("min-w-0 flex-1 leading-tight", hideWhenCollapsed)}>
          <div className="truncate text-[13.5px] font-semibold">{coach.fullName}</div>
          <div className="truncate text-[12px] text-muted-foreground">{coach.studioName ?? t("Coach")}</div>
        </div>
        <ChevronsUpDown className={cn("size-4 shrink-0 text-muted-foreground", hideWhenCollapsed)} />
      </DropdownMenuTrigger>
      <AccountMenuContent coach={coach} mode={mode} side="right" />
    </DropdownMenu>
  );
}

export function AccountMenuContent({ coach, mode, side = "bottom" }: { coach: ShellValue["coach"]; mode: DataMode; side?: "right" | "bottom" }) {
  const { t, locale } = useI18n();
  const { loginEnabled } = useShell();
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  return (
    <DropdownMenuContent side={side} align={side === "right" ? "end" : "end"} className="w-64">
      <DropdownMenuLabel className="normal-case tracking-normal">
        <div className="flex items-center gap-3 py-1">
          <Avatar src={coach.avatarUrl} name={coach.fullName} size={36} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-semibold text-foreground">{coach.fullName}</div>
            <div className="truncate text-[12px] font-normal text-muted-foreground">{coach.email ?? coach.studioName ?? ""}</div>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/settings#profilo">
          <UserRound /> {t("Profilo coach")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings">
          <Settings /> {t("Impostazioni")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link href="/settings#dati">
          <Database /> {mode === "demo" ? t("Modalità demo · dati locali") : t("Database Supabase")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() =>
          startTransition(async () => {
            await setLocaleAction(locale === "it" ? "en" : "it");
            router.refresh();
          })
        }
      >
        <Languages /> {locale === "it" ? t("English") : t("Italiano")}
      </DropdownMenuItem>
      {loginEnabled && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => startTransition(() => signOutAction())}>
            <LogOut /> {t("Esci")}
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
}

/* ----------------------------- Mobile tab bar ----------------------------- */
const TAB_HREFS = ["/", "/clients", "/workouts", "/nutrition"];

function MobileTabBar() {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const { unreadCount, coach, mode, loginEnabled } = useShell();
  const [moreOpen, setMoreOpen] = React.useState(false);
  if (isEditorRoute(pathname)) return null;

  const tabs = TAB_HREFS.map((href) => ALL_NAV_ITEMS.find((i) => i.href === href)!);
  const others = ALL_NAV_ITEMS.filter((i) => !TAB_HREFS.includes(i.href));
  const moreActive = others.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav
        data-mobile-nav
        aria-label={t("Navigazione")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid h-[60px] max-w-md grid-cols-5 px-2">
          {tabs.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium", active ? "text-forest" : "text-muted-foreground")}
                >
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-pale")}>
                    <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.9} />
                  </span>
                  {t(item.short ?? item.label)}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setMoreOpen(true)}
              className={cn("relative flex h-full w-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium", moreActive ? "text-forest" : "text-muted-foreground")}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-full", moreActive && "bg-pale")}>
                <MoreHorizontal className="size-[19px]" />
              </span>
              {t("menu|Altro")}
              {unreadCount > 0 && <span className="absolute top-2 right-[calc(50%-18px)] size-2 rounded-full bg-primary ring-2 ring-card" />}
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="px-4 pb-6">
          <SheetTitle className="px-2 pt-4 pb-3">{t("menu|Altro")}</SheetTitle>
          <div className="grid grid-cols-3 gap-2">
            {others.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-2xl border p-3.5 text-center text-[12.5px] font-medium",
                    active ? "border-sage bg-pale text-forest" : "bg-card",
                  )}
                >
                  <Icon className="size-5 text-forest" />
                  {t(item.short ?? item.label)}
                  {item.badge === "unread" && unreadCount > 0 && (
                    <span className="absolute top-2 right-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10.5px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <LanguageSwitcher locale={locale} />
            {loginEnabled && (
              <form action={signOutAction}>
                <Button type="submit" variant="destructive-ghost" size="sm">
                  <LogOut /> {t("Esci")}
                </Button>
              </form>
            )}
          </div>
          <Link href="/settings#profilo" onClick={() => setMoreOpen(false)} className="mt-3 flex items-center gap-3 rounded-2xl bg-muted p-3">
            <Avatar src={coach.avatarUrl} name={coach.fullName} size={40} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[14px] font-semibold">{coach.fullName}</div>
              <div className="truncate text-[12.5px] text-muted-foreground">{mode === "demo" ? t("Modalità demo · dati locali") : (coach.studioName ?? t("Coach"))}</div>
            </div>
          </Link>
        </SheetContent>
      </Sheet>
    </>
  );
}
