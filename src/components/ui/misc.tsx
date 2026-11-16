"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive, Switch as SwitchPrimitive, Tabs as TabsPrimitive, ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/* --------------------------------- Avatar --------------------------------- */
const tints = ["bg-[#e3efe0] text-[#1b5541]", "bg-[#e7eef7] text-[#2c5a8a]", "bg-[#f5ebdc] text-[#8a5a1c]", "bg-[#efe6f3] text-[#6b3d84]", "bg-[#f6e6e4] text-[#9a3b33]", "bg-[#e2f0ee] text-[#1f6b63]"];

function tintFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return tints[h % tints.length];
}

export function Avatar({ src, name, className, size = 40 }: { src?: string | null; name: string; className?: string; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  return (
    <AvatarPrimitive.Root
      className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-black/[0.04]", className)}
      style={{ width: size, height: size }}
    >
      {src && <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" />}
      <AvatarPrimitive.Fallback
        delayMs={src ? 250 : 0}
        className={cn("flex size-full items-center justify-center font-semibold", tintFor(name))}
        style={{ fontSize: Math.max(10, Math.round(size * 0.36)) }}
      >
        {initials || "?"}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

/* --------------------------------- Switch --------------------------------- */
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-transparent bg-border-strong p-0.5 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=checked]:bg-primary disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.18)] transition-transform duration-200 ease-[var(--ease-soft)] data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}

/* ---------------------------------- Tabs ---------------------------------- */
export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("scrollbar-none inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-muted p-1", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13.5px] font-medium text-muted-foreground transition-[color,background-color,box-shadow] outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=active]:bg-card data-[state=active]:text-forest data-[state=active]:shadow-[0_1px_3px_rgb(18_62_48/0.1)] [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 duration-200", className)} {...props} />;
}

/* ---------------------------- Segmented control --------------------------- */
interface SegmentedProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: React.ReactNode; badge?: React.ReactNode }[];
  className?: string;
  size?: "sm" | "default";
  "aria-label": string;
}

export function Segmented<T extends string>({ value, onValueChange, options, className, size = "default", ...rest }: SegmentedProps<T>) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={rest["aria-label"]}
      className={cn("scrollbar-none inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-muted p-1", className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-xl font-medium text-muted-foreground transition-[color,background-color,box-shadow] outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/30 data-[state=on]:bg-card data-[state=on]:text-forest data-[state=on]:shadow-[0_1px_3px_rgb(18_62_48/0.1)]",
            size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
          )}
        >
          {o.label}
          {o.badge}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

/* ----------------------------- Small helpers ----------------------------- */
export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div role="separator" aria-orientation={vertical ? "vertical" : "horizontal"} className={cn(vertical ? "w-px self-stretch" : "h-px w-full", "bg-border", className)} />;
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden {...props} />;
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border-strong bg-card px-1 font-sans text-[11px] font-medium text-muted-foreground", className)}>
      {children}
    </kbd>
  );
}
