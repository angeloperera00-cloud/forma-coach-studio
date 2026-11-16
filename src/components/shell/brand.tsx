import { cn } from "@/lib/utils";

export function BrandMark({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={cn("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9.5" fill="#123E30" />
      <path d="M11.5 23.5V11a1.75 1.75 0 0 1 1.75-1.75H21.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M11.5 16.5h6.5" stroke="#8FD19E" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compactClassName }: { compactClassName?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandMark />
      <div className={cn("min-w-0 leading-tight", compactClassName)}>
        <div className="text-[16px] font-semibold tracking-tight text-forest">Forma</div>
        <div className="text-[11.5px] font-medium text-muted-foreground">Coach Studio</div>
      </div>
    </div>
  );
}
