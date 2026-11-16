import { BellRing, CalendarClock, ClipboardCheck, Dumbbell, LibraryBig, NotebookPen, Salad, TrendingUp, UserPlus, UserRoundPen } from "lucide-react";
import type { ActivityType } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

const MAP: Record<ActivityType, { icon: typeof Dumbbell; className: string }> = {
  client_created: { icon: UserPlus, className: "bg-info-soft text-info" },
  client_updated: { icon: UserRoundPen, className: "bg-info-soft text-info" },
  workout_created: { icon: Dumbbell, className: "bg-muted text-forest" },
  workout_published: { icon: Dumbbell, className: "bg-pale text-primary" },
  nutrition_created: { icon: Salad, className: "bg-muted text-forest" },
  nutrition_published: { icon: Salad, className: "bg-pale text-primary" },
  progress_logged: { icon: TrendingUp, className: "bg-pale text-forest" },
  appointment_scheduled: { icon: CalendarClock, className: "bg-warning-soft text-warning" },
  appointment_updated: { icon: CalendarClock, className: "bg-warning-soft text-warning" },
  note_added: { icon: NotebookPen, className: "bg-muted text-muted-foreground" },
  library_updated: { icon: LibraryBig, className: "bg-muted text-muted-foreground" },
  reminder: { icon: BellRing, className: "bg-forest text-white" },
};

export function ActivityIcon({ type, className }: { type: ActivityType; className?: string }) {
  const entry = MAP[type] ?? { icon: ClipboardCheck, className: "bg-muted text-muted-foreground" };
  const Icon = entry.icon;
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", entry.className, className)} aria-hidden>
      <Icon className="size-[17px]" />
    </span>
  );
}
