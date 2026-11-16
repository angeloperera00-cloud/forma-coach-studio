import { msg } from "@/lib/i18n/core";
import { Apple, Bell, BookOpen, CalendarDays, ChartLine, Dumbbell, LayoutDashboard, Salad, Settings, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  badge?: "unread";
}

export const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: msg("Generale"),
    items: [
      { href: "/", label: msg("Dashboard"), short: msg("Home"), icon: LayoutDashboard },
      { href: "/clients", label: msg("Clienti"), icon: Users },
    ],
  },
  {
    label: msg("Programmazione"),
    items: [
      { href: "/workouts", label: msg("Schede di allenamento"), short: msg("Schede"), icon: Dumbbell },
      { href: "/nutrition", label: msg("Piani alimentari"), short: msg("Nutrizione"), icon: Salad },
    ],
  },
  {
    label: msg("Librerie"),
    items: [
      { href: "/exercises", label: msg("Libreria esercizi"), short: msg("Esercizi"), icon: BookOpen },
      { href: "/foods", label: msg("Libreria alimenti"), short: msg("Alimenti"), icon: Apple },
    ],
  },
  {
    label: msg("Monitoraggio"),
    items: [
      { href: "/progress", label: msg("Progressi clienti"), short: msg("Progressi"), icon: ChartLine },
      { href: "/calendar", label: msg("Calendario"), icon: CalendarDays },
      { href: "/notifications", label: msg("Notifiche"), icon: Bell, badge: "unread" },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: msg("Impostazioni"), icon: Settings };

export const ALL_NAV_ITEMS = [...NAV_SECTIONS.flatMap((s) => s.items), SETTINGS_ITEM];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Editors take the full mobile viewport (like the iPhone reference): no bottom tab bar. */
export function isEditorRoute(pathname: string) {
  return /^\/(workouts|nutrition)\/(new|[0-9a-f-]{36})$/.test(pathname);
}
