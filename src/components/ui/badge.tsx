import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-medium [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        success: "bg-pale text-primary",
        forest: "bg-forest text-white",
        warning: "bg-warning-soft text-warning",
        info: "bg-info-soft text-info",
        danger: "bg-danger-soft text-destructive",
        outline: "border border-border-strong text-muted-foreground",
      },
      size: {
        sm: "h-5 px-2 text-[11px]",
        default: "h-6 px-2.5 text-[12px]",
      },
    },
    defaultVariants: { variant: "neutral", size: "default" },
  },
);

export function Badge({ className, variant, size, dot, children, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
