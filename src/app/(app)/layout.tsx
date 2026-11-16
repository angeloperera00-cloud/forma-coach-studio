import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthState, getSession } from "@/lib/auth/session";
import { supabaseAuthConfig } from "@/lib/auth/config";
import { getClientLink } from "@/lib/auth/clients";
import { getRepository } from "@/lib/data";
import { syncReminders } from "@/lib/data/reminders";
import { AppShell } from "@/components/shell/shell";
import { ConfirmProvider } from "@/components/common/confirm";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Server-side gate for every coach page (the proxy check is only optimistic).
  const session = await getSession();
  if (!session) {
    // Clients → their read-only area; signed in but not (yet) approved → pending; otherwise sign in.
    if (await getClientLink()) redirect("/portale");
    const state = supabaseAuthConfig() ? await getAuthState() : null;
    redirect(state ? "/pending" : "/login");
  }
  const repo = getRepository();
  await syncReminders(repo);
  const [coach, unreadCount, notifications, cookieStore] = await Promise.all([
    repo.getCoach(),
    repo.countUnreadActivity(),
    repo.listActivity({ limit: 8 }),
    cookies(),
  ]);
  const pref = cookieStore.get("forma-sidebar")?.value;

  return (
    <ConfirmProvider>
      <AppShell
        coach={{ fullName: coach.fullName, avatarUrl: coach.avatarUrl, studioName: coach.studioName, email: coach.email ?? session.email }}
        mode={repo.mode}
        loginEnabled={session.provider !== "none"}
        unreadCount={unreadCount}
        notifications={notifications}
        sidebarPref={pref === "collapsed" || pref === "expanded" ? pref : "auto"}
      >
        {children}
      </AppShell>
    </ConfirmProvider>
  );
}
