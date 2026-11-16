import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { syncReminders } from "@/lib/data/reminders";
import { AppShell } from "@/components/shell/shell";
import { ConfirmProvider } from "@/components/common/confirm";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Server-side gate for every coach page (the proxy check is only optimistic).
  const session = await getSession();
  if (!session) redirect("/login");
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
        unreadCount={unreadCount}
        notifications={notifications}
        sidebarPref={pref === "collapsed" || pref === "expanded" ? pref : "auto"}
      >
        {children}
      </AppShell>
    </ConfirmProvider>
  );
}
