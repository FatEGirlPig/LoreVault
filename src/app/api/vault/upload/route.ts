import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminClient, getUser } from "@/lib/supabase/server";
import { capacityOf, checkUpload, sanitizeFilename, SUPABASE_MAX_FILE_BYTES } from "@/lib/storage/quota";
import { provider, signedUploadUrl } from "@/lib/storage";
import { rateLimit } from "@/lib/security/rate-limit";

const Body = z.object({
  filename: z.string().min(1).max(255), contentType: z.string().max(100),
  size: z.number().int().positive(), folder: z.string().max(100).optional(),
  title: z.string().max(100).optional(), visibility: z.enum(["private", "friends", "public"]).optional(),
  gameId: z.uuid().optional(), clip: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!rateLimit(`upload:${user.id}`, 30, 60_000)) return NextResponse.json({ error: "Too many uploads. Wait a minute." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { filename, contentType, size, folder, title, visibility, gameId, clip } = parsed.data;
  if (clip && !contentType.startsWith("video/")) return NextResponse.json({ error: "Clips must be MP4 or WebM videos." }, { status: 400 });

  const db = adminClient();
  const [{ data: quota }, { data: usage }, { data: pending }, { data: privacy }] = await Promise.all([
    db.from("storage_quotas").select("*").eq("user_id", user.id).single(),
    db.from("storage_usage").select("used_bytes").eq("user_id", user.id).single(),
    db.from("media_files").select("size_bytes").eq("owner_id", user.id).eq("status", "pending")
      .gt("created_at", new Date(Date.now() - 3600e3).toISOString()),
    db.from("privacy_settings").select("media_default").eq("user_id", user.id).single(),
  ]);
  if (!quota || !usage) return NextResponse.json({ error: "Storage account not found." }, { status: 500 });

  const check = checkUpload({
    filename, contentType, sizeBytes: size, usedBytes: Number(usage.used_bytes),
    pendingBytes: (pending ?? []).reduce((t, p) => t + Number(p.size_bytes), 0),
    capacityBytes: capacityOf(quota), overQuotaGrace: !!quota.grace_until,
    maxFileBytes: provider === "supabase" ? SUPABASE_MAX_FILE_BYTES : undefined,
  });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const safeName = sanitizeFilename(filename);
  const objectKey = `${user.id}/${randomUUID()}/${safeName}`;
  const { data: file, error } = await db.from("media_files").insert({
    owner_id: user.id, object_key: objectKey, filename: safeName, content_type: contentType, size_bytes: size,
    category: check.category, folder: folder || null, title: title?.trim() || null, game_id: gameId ?? null,
    visibility: visibility ?? privacy?.media_default ?? "private",
  }).select("id").single();
  if (error) return NextResponse.json({ error: "Could not start upload." }, { status: 500 });

  return NextResponse.json({ id: file.id, mode: provider, url: await signedUploadUrl(objectKey, contentType, size) });
}
