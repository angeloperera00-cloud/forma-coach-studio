import { NextResponse } from "next/server";
import { getRepository, AppError } from "@/lib/data";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/domain/constants";
import type { MediaUpload } from "@/lib/data/repository";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";

const MAX_BYTES = 5 * 1024 * 1024;

/** Verify the real file type from its magic bytes — never trust the client-declared MIME type. */
function sniff(bytes: Uint8Array): Pick<MediaUpload, "contentType" | "extension"> | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { contentType: "image/jpeg", extension: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { contentType: "image/png", extension: "png" };
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
    return { contentType: "image/webp", extension: "webp" };
  return null;
}

export async function POST(request: Request) {
  const { t } = await getI18n();
  if (!(await getSession())) return NextResponse.json({ error: t("Sessione scaduta: accedi di nuovo.") }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "");
    if (!(file instanceof File)) return NextResponse.json({ error: t("Nessun file ricevuto") }, { status: 400 });
    if (!MEDIA_FOLDERS.includes(folder as MediaFolder)) return NextResponse.json({ error: t("Cartella non valida") }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: t("Immagine troppo grande (massimo 5 MB)") }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = sniff(bytes);
    if (!type) return NextResponse.json({ error: t("Formato non supportato: usa JPG, PNG o WebP") }, { status: 415 });

    const url = await getRepository().uploadMedia({ bytes, ...type }, folder as MediaFolder);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: t(error.template, error.params) }, { status: 400 });
    console.error("[upload]", error);
    return NextResponse.json({ error: t("Caricamento non riuscito") }, { status: 500 });
  }
}
