"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

export const fieldBase =
  "w-full min-w-0 rounded-xl border border-input bg-card text-[14px] text-foreground shadow-[0_1px_1px_rgb(18_62_48/0.03)] transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive/70 aria-invalid:ring-destructive/15";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(fieldBase, "h-10 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(fieldBase, "min-h-20 resize-y px-3 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="label" className={cn("text-[13px] font-medium text-muted-foreground", className)} {...props} />;
}

interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  optional?: boolean;
}

/**
 * Label + control + hint/error, with consistent spacing.
 * Validation messages are Italian source strings (zod schemas), translated here.
 */
export function Field({ label, htmlFor, error, hint, className, children, optional }: FieldProps) {
  const { t } = useI18n();
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {optional && <span className="font-normal text-muted-foreground/80"> ({t("opzionale")})</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] font-medium text-destructive">
          {t(error)}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
