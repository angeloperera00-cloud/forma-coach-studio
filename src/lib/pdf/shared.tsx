import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import React from "react";
import { Font, StyleSheet, Text, View, Svg, Rect, Path } from "@react-pdf/renderer";
import type { I18n } from "@/lib/i18n/core";

/* --------------------------------- fonts --------------------------------- */
let fontsReady = false;
export function registerFonts() {
  if (fontsReady) return;
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(dir, "Inter_400Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "Inter_500Medium.ttf"), fontWeight: 500 },
      { src: path.join(dir, "Inter_600SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(dir, "Inter_700Bold.ttf"), fontWeight: 700 },
    ],
  });
  // No automatic hyphenation: Italian/English names should wrap on whole words.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

/* -------------------------------- palette -------------------------------- */
export const C = {
  forest: "#123E30",
  primary: "#16834B",
  sage: "#DDEBD9",
  pale: "#F0F6EB",
  tile: "#F3F6F3",
  text: "#17221D",
  muted: "#718078",
  border: "#E8EEEA",
  warning: "#A86B12",
};

export const base = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9.5, color: C.text, paddingTop: 0, paddingBottom: 54, paddingHorizontal: 0, backgroundColor: "#FFFFFF" },
  body: { paddingHorizontal: 34 },
  h2: { fontSize: 13, fontWeight: 700, color: C.forest },
  muted: { color: C.muted },
  small: { fontSize: 8, color: C.muted },
  chip: { fontSize: 7.5, fontWeight: 600, color: C.forest, backgroundColor: C.pale, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  notes: { marginTop: 6, padding: 8, borderRadius: 6, backgroundColor: C.tile, fontSize: 8.5, color: C.text, lineHeight: 1.45 },
});

/* -------------------------------- header --------------------------------- */
function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width="32" height="32" rx="9.5" fill="#FFFFFF" fillOpacity={0.12} />
      <Path d="M11.5 23.5V11a1.75 1.75 0 0 1 1.75-1.75H21.5" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M11.5 16.5h6.5" stroke="#8FD19E" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function DocHeader({ kind, title, client, coach, studio, status, i18n }: { kind: string; title: string; client: string | null; coach: string; studio: string | null; status: string; i18n: I18n }) {
  const { t, fmt } = i18n;
  return (
    <View fixed={false} style={{ backgroundColor: C.forest, paddingHorizontal: 34, paddingTop: 26, paddingBottom: 22, marginBottom: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BrandMark />
          <View>
            <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: 700 }}>{studio || "Forma"}</Text>
            <Text style={{ color: "#B9D3C4", fontSize: 7.5 }}>{coach}</Text>
          </View>
        </View>
        <Text style={{ color: "#B9D3C4", fontSize: 7.5 }}>{t("Generato il {date}", { date: fmt.instant(new Date(), { day: "numeric", month: "long", year: "numeric" }) })}</Text>
      </View>
      <Text style={{ color: "#8FD19E", fontSize: 8, fontWeight: 600, letterSpacing: 1, marginTop: 18, textTransform: "uppercase" }}>{kind}</Text>
      <Text style={{ color: "#FFFFFF", fontSize: 21, fontWeight: 700, marginTop: 3 }}>{title}</Text>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 6 }}>
        <Text style={{ color: "#DDEBD9", fontSize: 9 }}>
          {t("Cliente")}: <Text style={{ color: "#FFFFFF", fontWeight: 600 }}>{client ?? t("Senza cliente")}</Text>
        </Text>
        <Text style={{ color: "#DDEBD9", fontSize: 9 }}>
          {t("Stato")}: <Text style={{ color: "#FFFFFF", fontWeight: 600 }}>{status}</Text>
        </Text>
      </View>
    </View>
  );
}

export function DocFooter({ footer, i18n }: { footer: string | null; i18n: I18n }) {
  const { t } = i18n;
  return (
    <View fixed style={{ position: "absolute", bottom: 20, left: 34, right: 34, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 0.6, borderTopColor: C.border, paddingTop: 6 }}>
      <Text style={{ fontSize: 7.5, color: C.muted, maxWidth: 420 }}>{footer || "Forma · Coach Studio"}</Text>
      <Text style={{ fontSize: 7.5, color: C.muted }} render={({ pageNumber, totalPages }) => t("Pagina {page} di {total}", { page: pageNumber, total: totalPages })} />
    </View>
  );
}

export function Stat({ label, value, width }: { label: string; value: string; width?: number | string }) {
  return (
    <View style={{ flexGrow: 1, width, backgroundColor: C.tile, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 9 }}>
      <Text style={{ fontSize: 7.5, color: C.muted }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: 700, marginTop: 1 }}>{value}</Text>
    </View>
  );
}

/* --------------------------------- images -------------------------------- */
export type PdfImage = { data: Buffer; format: "png" | "jpg" };
const cache = new Map<string, Promise<PdfImage | null>>();

/** Loads JPEG/PNG images for embedding (react-pdf can't decode WebP); anything else is skipped. */
export function loadImage(url: string | null | undefined): Promise<PdfImage | null> {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url) || url.startsWith("/api/media/")) {
    cache.set(
      url,
      (async () => {
        try {
          let bytes: Buffer;
          if (url.startsWith("/api/media/")) {
            const [, , , folder, file] = url.split("/");
            if (!/^[a-z]+$/.test(folder ?? "") || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(file ?? "")) return null;
            const { demoDataDir } = await import("@/lib/data/demo/repository");
            bytes = await fs.readFile(path.join(await demoDataDir(), "media", folder, file));
          } else if (url.startsWith("/")) {
            const clean = path.normalize(url.split("?")[0]).replace(/^([/\\])+/, "");
            if (clean.startsWith("..")) return null;
            bytes = await fs.readFile(path.join(process.cwd(), "public", clean));
          } else if (url.startsWith("https://")) {
            // Only the project's own Supabase Storage (never arbitrary hosts).
            const host = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).host : null;
            if (!host || new URL(url).host !== host) return null;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) return null;
            bytes = Buffer.from(await res.arrayBuffer());
          } else return null;
          if (bytes[0] === 0xff && bytes[1] === 0xd8) return { data: bytes, format: "jpg" };
          if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { data: bytes, format: "png" };
          return null;
        } catch {
          return null;
        }
      })(),
    );
  }
  return cache.get(url)!;
}

/* -------------------------------- response ------------------------------- */
export function pdfResponse(buffer: Buffer | Uint8Array, filename: string) {
  const ascii = filename.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || "forma.pdf";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function pdfFilename(...parts: (string | null | undefined)[]) {
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

export function imageResponse(buffer: Buffer, format: "png" | "jpg", parts: (string | null | undefined)[]) {
  const filename = pdfFilename(...parts).replace(/\.pdf$/, `.${format}`);
  const ascii = filename.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "") || `forma.${format}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": format === "jpg" ? "image/jpeg" : "image/png",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
