"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/overlays";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

/**
 * Warns before leaving an editor with unsaved changes:
 * - browser reload/close → native beforeunload prompt
 * - in-app links → refined confirmation dialog
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const { t } = useI18n();
  const router = useRouter();
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);
  const dirtyRef = React.useRef(dirty);
  React.useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  const dialog = (
    <AlertDialog open={pendingHref !== null} onOpenChange={(o) => !o && setPendingHref(null)}>
      <AlertDialogContent>
        <div className="flex flex-col gap-2">
          <AlertDialogTitle>{t("Modifiche non salvate")}</AlertDialogTitle>
          <AlertDialogDescription>{t("Se esci ora perderai le modifiche fatte. Vuoi uscire comunque?")}</AlertDialogDescription>
        </div>
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel>{t("Resta qui")}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={() => {
              const href = pendingHref;
              dirtyRef.current = false;
              setPendingHref(null);
              if (href) router.push(href);
            }}
          >
            
            {t("Esci senza salvare")}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { dialog };
}

/* --------------------------------- TileInput -------------------------------- */
interface TileInputProps {
  label: string;
  /** Value shown when not editing (e.g. 90" for 90 seconds) */
  display: string;
  /** Raw value placed in the input while editing */
  raw: string;
  /** Return false to reject the value (the tile reverts and flashes red). */
  onCommit: (raw: string) => boolean;
  onStep?: (direction: 1 | -1) => void;
  inputMode?: "numeric" | "decimal" | "text";
  placeholder?: string;
  className?: string;
  muted?: boolean;
  "aria-label"?: string;
}

/** Grey stat tile from the reference (label above, bold value below) that is also an inline input. */
export function TileInput({ label, display, raw, onCommit, onStep, inputMode = "text", placeholder = "—", className, muted, ...rest }: TileInputProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(raw);
  const [invalid, setInvalid] = React.useState(false);
  const id = React.useId();

  const commit = () => {
    setEditing(false);
    if (draft === raw) return;
    const ok = onCommit(draft);
    if (!ok) {
      setInvalid(true);
      setDraft(raw);
      window.setTimeout(() => setInvalid(false), 1200);
    }
  };

  return (
    <label
      htmlFor={id}
      className={cn(
        "group/tile flex min-w-0 cursor-text flex-col items-center justify-center rounded-xl bg-tile px-2 py-1.5 text-center transition-[background-color,box-shadow] duration-150 focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/35 hover:bg-[#ecf1ec]",
        invalid && "bg-danger-soft ring-2 ring-destructive/40",
        className,
      )}
    >
      <span className="text-[11.5px] font-medium text-muted-foreground">{label}</span>
      <input
        id={id}
        aria-label={rest["aria-label"] ?? label}
        aria-invalid={invalid || undefined}
        inputMode={inputMode}
        autoComplete="off"
        value={editing ? draft : display}
        placeholder={placeholder}
        onFocus={(e) => {
          setDraft(raw);
          setEditing(true);
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(raw);
            setEditing(false);
            requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
          }
          if (onStep && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            onStep(e.key === "ArrowUp" ? 1 : -1);
            setEditing(false);
          }
        }}
        className={cn(
          "w-full min-w-0 bg-transparent text-center text-[16px] leading-6 font-semibold text-foreground outline-none tabular placeholder:font-medium placeholder:text-muted-foreground/60",
          muted && !editing && "text-muted-foreground",
        )}
      />
    </label>
  );
}

/** Fetches a file and saves it with a friendly name (works after async work, unlike window.open). */
export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Esportazione non riuscita");
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

export function safeFilename(...parts: (string | null | undefined)[]) {
  return (
    parts
      .filter(Boolean)
      .join(" - ")
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) + ".pdf"
  );
}
