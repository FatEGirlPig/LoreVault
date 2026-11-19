import { NextResponse } from "next/server";
import { adminClient, getUser } from "@/lib/supabase/server";
import { deleteObject, headObject } from "@/lib/storage";

export async function POST(req: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  const db = adminClient();
  const { data: file } = await db.from("media_files").select("*").eq("id", id ?? "").eq("owner_id", user.id).eq("status", "pending").single();
  if (!file) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  // Verify what actually landed in storage matches what was authorised.
  const head = await headObject(file.object_key);
  if (!head || head.size !== Number(file.size_bytes) || head.contentType !== file.content_type) {
    if (head) await deleteObject(file.object_key);
    await db.from("media_files").delete().eq("id", file.id);
    return NextResponse.json({ error: "Uploaded file did not match the request." }, { status: 400 });
  }
  // TODO(production): enqueue malware scan before marking ready.
  await db.from("media_files").update({ status: "ready" }).eq("id", file.id);
  return NextResponse.json({ ok: true });
}
