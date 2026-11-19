import { GB } from "@/lib/plans";

export const MAX_FILE_BYTES = 2 * GB;
/** Supabase free plan caps each uploaded file at 50 MB. */
export const SUPABASE_MAX_FILE_BYTES = 50 * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, { category: "screenshot" | "video" | "note" | "document" | "other"; ext: string[] }> = {
  "image/png": { category: "screenshot", ext: ["png"] },
  "image/jpeg": { category: "screenshot", ext: ["jpg", "jpeg"] },
  "image/webp": { category: "screenshot", ext: ["webp"] },
  "image/gif": { category: "screenshot", ext: ["gif"] },
  "video/mp4": { category: "video", ext: ["mp4"] },
  "video/webm": { category: "video", ext: ["webm"] },
  "text/plain": { category: "note", ext: ["txt"] },
  "text/markdown": { category: "note", ext: ["md"] },
  "application/pdf": { category: "document", ext: ["pdf"] },
};

export type UploadCheck =
  | { ok: true; category: (typeof ALLOWED_TYPES)[string]["category"] }
  | { ok: false; error: string };

/** Pure server-side validation of an upload request against type rules and remaining quota. */
export function checkUpload(input: {
  filename: string; contentType: string; sizeBytes: number;
  usedBytes: number; pendingBytes: number; capacityBytes: number; overQuotaGrace: boolean; maxFileBytes?: number;
}): UploadCheck {
  const { filename, contentType, sizeBytes, usedBytes, pendingBytes, capacityBytes } = input;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) return { ok: false, error: "Invalid file size." };
  const max = input.maxFileBytes ?? MAX_FILE_BYTES;
  if (sizeBytes > max) return { ok: false, error: `File is too large. The limit is ${max >= GB ? `${max / GB} GB` : `${Math.round(max / 1048576)} MB`} per file.` };
  const rule = ALLOWED_TYPES[contentType];
  if (!rule) return { ok: false, error: "This file type is not supported." };
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (!rule.ext.includes(ext)) return { ok: false, error: "File extension does not match its type." };
  if (input.overQuotaGrace || usedBytes > capacityBytes)
    return { ok: false, error: "Uploads are paused because your storage is over your plan's limit." };
  if (usedBytes + pendingBytes + sizeBytes > capacityBytes)
    return { ok: false, error: "Not enough storage remaining. Free up space or upgrade your plan." };
  return { ok: true, category: rule.category };
}

export function capacityOf(q: { base_bytes: number; addon_bytes: number }): number {
  return Number(q.base_bytes) + Number(q.addon_bytes);
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 200) || "file";
}
