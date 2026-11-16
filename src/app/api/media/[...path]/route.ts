import { promises as fs } from "node:fs";
import path from "node:path";
import { getRepository } from "@/lib/data";
import { demoDataDir } from "@/lib/data/demo/repository";
import { MEDIA_FOLDERS, type MediaFolder } from "@/lib/domain/constants";
import { getSession } from "@/lib/auth/session";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
const FILE_RE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Serves images uploaded in demo mode from .demo-data/media. Supabase mode uses Storage URLs instead. */
export async function GET(_request: Request, ctx: RouteContext<"/api/media/[...path]">) {
  const { path: parts } = await ctx.params;
  if (getRepository().mode !== "demo") return new Response("Not found", { status: 404 });
  if (!(await getSession())) return new Response("Unauthorized", { status: 401 });
  const [folder, file] = parts ?? [];
  if (parts?.length !== 2 || !MEDIA_FOLDERS.includes(folder as MediaFolder) || !FILE_RE.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(path.join(await demoDataDir(), "media", folder, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[file.split(".").pop()!],
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
