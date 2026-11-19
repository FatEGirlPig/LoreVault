import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedDownloadUrl } from "@/lib/storage/r2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS decides access: owner, or permitted by the file's visibility.
  const { data: file } = await supabase.from("media_files").select("object_key, filename").eq("id", id).single();
  if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.redirect(await signedDownloadUrl(file.object_key, file.filename));
}
