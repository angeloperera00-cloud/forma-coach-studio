"use client";

import * as React from "react";
import { AlertDialog as AlertPrimitive, Dialog as DialogPrimitive, Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import { touchSafeAutoFocus } from "@/lib/hooks/use-touch";
import { useI18n } from "@/lib/i18n/client";

/* --------------------------------- Dialog --------------------------------- */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlayClass =
  "fixed inset-0 z-50 bg-[#0c1f18]/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200";

export function DialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  const { t } = useI18n();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 overflow-y-auto rounded-3xl border bg-card p-6 shadow-pop outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] data-[state=open]:slide-in-from-bottom-2 duration-200",
          className,
        )}
        {...props}
        onOpenAutoFocus={touchSafeAutoFocus(props.onOpenAutoFocus)}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute top-4 right-4 text-muted-foreground")}>
            <X />
            <span className="sr-only">{t("Chiudi")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

/* ---------------------------------- Sheet --------------------------------- */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const sheetSide = {
  right:
    "inset-y-2 right-2 h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[520px] rounded-3xl data-[state=open]:slide-in-from-right-8 data-[state=closed]:slide-out-to-right-8",
  left: "inset-y-0 left-0 h-dvh w-[86%] max-w-[320px] rounded-r-3xl data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  bottom:
    "inset-x-0 bottom-0 max-h-[92dvh] w-full rounded-t-3xl pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
} as const;

export function SheetContent({
  className,
  children,
  side = "right",
  hideClose,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: keyof typeof sheetSide; hideClose?: boolean }) {
  const { t } = useI18n();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col border bg-card shadow-pop outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-250 ease-[var(--ease-soft)]",
          sheetSide[side],
          className,
        )}
        {...props}
        onOpenAutoFocus={touchSafeAutoFocus(props.onOpenAutoFocus)}
      >
        {side === "bottom" && <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong" aria-hidden />}
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute top-4 right-4 text-muted-foreground")}>
            <X />
            <span className="sr-only">{t("Chiudi")}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 border-b px-6 pt-6 pb-4 pr-14", className)} {...props} />;
}
export function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("scrollbar-thin flex-1 overflow-y-auto px-6 py-5", className)} {...props} />;
}
export function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center justify-end gap-2 border-t px-6 py-4", className)} {...props} />;
}
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;

/* ------------------------------- AlertDialog ------------------------------ */
export const AlertDialog = AlertPrimitive.Root;
export const AlertDialogTrigger = AlertPrimitive.Trigger;

export function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Content>) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className={overlayClass} />
      <AlertPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-3xl border bg-card p-6 shadow-pop outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=closed]:zoom-out-[0.97] duration-200",
          className,
        )}
        {...props}
      />
    </AlertPrimitive.Portal>
  );
}
export function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Title>) {
  return <AlertPrimitive.Title className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}
export function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Description>) {
  return <AlertPrimitive.Description className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}
export function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof AlertPrimitive.Cancel>) {
  return <AlertPrimitive.Cancel className={cn(buttonVariants({ variant: "outline" }), className)} {...props} />;
}
export const AlertDialogAction = AlertPrimitive.Action;

/* --------------------------------- Popover -------------------------------- */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export function PopoverContent({ className, align = "start", sideOffset = 8, ...props }: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-2xl border bg-popover p-3 text-popover-foreground shadow-pop outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] duration-150",
          className,
        )}
        {...props}
        onOpenAutoFocus={touchSafeAutoFocus(props.onOpenAutoFocus)}
      />
    </PopoverPrimitive.Portal>
  );
}

/* --------------------------------- Tooltip -------------------------------- */
export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ content, children, side = "top", disabled }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "right" | "bottom" | "left"; disabled?: boolean }) {
  if (disabled) return <>{children}</>;
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-lg bg-forest px-2.5 py-1.5 text-[12px] font-medium text-white shadow-raised data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
