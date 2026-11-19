import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedStreamUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS: returns the file only if the viewer may see it (owner, friend, or public).
  const { data: file } = await supabase.from("media_files").select("object_key, content_type").eq("id", id).single();
  if (!file || !/^(video|image)\//.test(file.content_type)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.redirect(await signedStreamUrl(file.object_key, file.content_type), { headers: { "Cache-Control": "private, max-age=3000" } });
}
