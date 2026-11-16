"use client";

import * as React from "react";
import { useI18n } from "@/lib/i18n/client";


/** Relative time that refreshes every minute. Server and client may differ by seconds, hence suppressHydrationWarning. */
export function RelativeTime({ date, className }: { date: string; className?: string }) {
  const { fmt } = useI18n();
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time dateTime={date} title={fmt.dateTime(date)} className={className} suppressHydrationWarning>
      {fmt.relative(date, now)}
    </time>
  );
}
