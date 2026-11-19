import "server-only";
import { adminClient } from "@/lib/supabase/server";

export const BUCKET = "media";
const bucket = () => adminClient().storage.from(BUCKET);

export async function signedUploadUrl(key: string) {
  const { data, error } = await bucket().createSignedUploadUrl(key);
  if (error) throw error;
  return data.signedUrl;
}
export async function signedDownloadUrl(key: string, filename: string) {
  const { data, error } = await bucket().createSignedUrl(key, 300, { download: filename });
  if (error) throw error;
  return data.signedUrl;
}
export async function signedStreamUrl(key: string) {
  const { data, error } = await bucket().createSignedUrl(key, 3600);
  if (error) throw error;
  return data.signedUrl;
}
export async function headObject(key: string) {
  const dir = key.slice(0, key.lastIndexOf("/")), name = key.slice(key.lastIndexOf("/") + 1);
  const { data } = await bucket().list(dir, { search: name, limit: 5 });
  const o = data?.find((x) => x.name === name);
  return o ? { size: Number(o.metadata?.size ?? 0), contentType: String(o.metadata?.mimetype ?? "") } : null;
}
export async function deleteObject(key: string) { await bucket().remove([key]); }
