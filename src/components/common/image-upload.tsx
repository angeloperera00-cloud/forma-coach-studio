"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MediaFolder } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";
import { Thumb } from "./basics";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

/** Downscale in the browser before uploading (max 1600px, JPEG) — keeps storage small and PDF-compatible. */
async function prepare(file: File, maxDim = 1600): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Formato non supportato: usa JPG, PNG o WebP");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.type === "image/jpeg" && file.size < 1_500_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const keepPng = file.type === "image/png" && file.size < 600_000;
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(msg("Conversione non riuscita")))), keepPng ? "image/png" : "image/jpeg", 0.86),
  );
}

export async function uploadImage(file: File, folder: MediaFolder): Promise<string> {
  const blob = await prepare(file);
  const form = new FormData();
  form.append("file", blob, blob.type === "image/png" ? "image.png" : "image.jpg");
  form.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Caricamento non riuscito");
  return json.url;
}

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: MediaFolder;
  className?: string;
  shape?: "square" | "circle" | "wide";
  label?: string;
  contain?: boolean;
}

export function ImageUpload({ value, onChange, folder, className, shape = "square", label: labelProp, contain }: ImageUploadProps) {
  const { t } = useI18n();
  const label = labelProp ?? t("Carica foto");
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, folder));
      toast.success(t("Immagine caricata"));
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t("Caricamento non riuscito"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handle(e.dataTransfer.files[0]);
        }}
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden border border-dashed border-border-strong bg-muted text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-forest focus-visible:ring-[3px] focus-visible:ring-ring/25",
          shape === "circle" ? "size-20 rounded-full" : shape === "wide" ? "h-24 w-36 rounded-2xl" : "size-24 rounded-2xl",
          dragging && "border-primary bg-pale",
          value && "border-solid",
        )}
        aria-label={value ? t("Sostituisci immagine") : label}
      >
        {value ? (
          <Thumb src={value} className={cn("absolute inset-0 size-full rounded-none", shape === "circle" && "rounded-full")} contain={contain} sizes="160px" />
        ) : (
          <ImagePlus className="size-6" />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-card/70">
            <Loader2 className="size-5 animate-spin text-forest" />
          </span>
        )}
      </button>
      <div className="flex flex-col items-start gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {value ? t("Sostituisci") : label}
        </Button>
        {value && (
          <Button type="button" variant="destructive-ghost" size="sm" onClick={() => onChange(null)} disabled={busy}>
            <Trash2 /> {t("Rimuovi")}
          </Button>
        )}
        {!value && <span className="text-[12px] text-muted-foreground">{t("JPG, PNG o WebP · max 5 MB")}</span>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => handle(e.target.files?.[0])} />
    </div>
  );
}
