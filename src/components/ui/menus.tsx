"use client";

import * as React from "react";
import { useI18n } from "@/lib/i18n/client";
import { DropdownMenu as MenuPrimitive, Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldBase } from "./input";

/* ------------------------------ DropdownMenu ------------------------------ */
export const DropdownMenu = MenuPrimitive.Root;
export const DropdownMenuTrigger = MenuPrimitive.Trigger;
export const DropdownMenuGroup = MenuPrimitive.Group;
export const DropdownMenuSub = MenuPrimitive.Sub;

const menuSurface =
  "z-50 min-w-48 overflow-hidden rounded-2xl border bg-popover p-1.5 text-popover-foreground shadow-pop outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.97] data-[state=open]:zoom-in-[0.97] duration-150";

export function DropdownMenuContent({ className, sideOffset = 6, align = "end", ...props }: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content sideOffset={sideOffset} align={align} className={cn(menuSurface, "origin-(--radix-dropdown-menu-content-transform-origin)", className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

const itemClass =
  "relative flex cursor-default select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] outline-none transition-colors data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

export function DropdownMenuItem({ className, destructive, ...props }: React.ComponentProps<typeof MenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <MenuPrimitive.Item
      className={cn(itemClass, destructive && "text-destructive data-[highlighted]:bg-danger-soft [&_svg]:text-destructive", className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Label>) {
  return <MenuPrimitive.Label className={cn("px-2.5 pt-1.5 pb-1 text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, children, ...props }: React.ComponentProps<typeof MenuPrimitive.SubTrigger>) {
  return (
    <MenuPrimitive.SubTrigger className={cn(itemClass, "data-[state=open]:bg-muted", className)} {...props}>
      {children}
      <ChevronRight className="ml-auto" />
    </MenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof MenuPrimitive.SubContent>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.SubContent sideOffset={6} className={cn(menuSurface, className)} {...props} />
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem className={cn(itemClass, "pr-8", className)} {...props}>
      {children}
      <MenuPrimitive.ItemIndicator className="absolute right-2.5">
        <Check className="text-primary!" />
      </MenuPrimitive.ItemIndicator>
    </MenuPrimitive.CheckboxItem>
  );
}

/* --------------------------------- Select --------------------------------- */
export interface SelectOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
}

interface SelectProps<T extends string> {
  value: T | null | undefined;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  icon?: React.ReactNode;
  "aria-label"?: string;
}

/** Radix Select with the app's field styling. Use "" via a "none" option for clearable selects. */
export function Select<T extends string>({ value, onValueChange, options, placeholder, id, className, disabled, invalid, icon, ...rest }: SelectProps<T>) {
  const { t } = useI18n();
  return (
    <SelectPrimitive.Root value={value ?? undefined} onValueChange={(v) => onValueChange(v as T)} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-label={rest["aria-label"]}
        className={cn(fieldBase, "flex h-10 items-center gap-2 px-3 text-left data-[placeholder]:text-muted-foreground [&>span]:truncate", className)}
      >
        {icon}
        <SelectPrimitive.Value placeholder={placeholder ?? t("Seleziona")} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            menuSurface,
            "max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) origin-(--radix-select-content-transform-origin)",
          )}
        >
          <SelectPrimitive.Viewport className="scrollbar-thin max-h-80 overflow-y-auto">
            {options.map((o) => (
              <SelectPrimitive.Item key={o.value} value={o.value} className={cn(itemClass, "pr-8")}>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2.5">
                  <Check className="text-primary!" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
