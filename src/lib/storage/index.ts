import "server-only";
import * as r2 from "./r2";
import * as sb from "./supabase";

/** Storage backend: Supabase Storage by default (free, no extra account); set STORAGE_PROVIDER=r2 to use Cloudflare R2. */
export const provider = process.env.STORAGE_PROVIDER === "r2" ? "r2" : "supabase";

export const signedUploadUrl = (key: string, contentType: string, size: number) =>
  provider === "r2" ? r2.signedUploadUrl(key, contentType, size) : sb.signedUploadUrl(key);
export const signedDownloadUrl = (key: string, filename: string) =>
  provider === "r2" ? r2.signedDownloadUrl(key, filename) : sb.signedDownloadUrl(key, filename);
export const signedStreamUrl = (key: string, contentType: string) =>
  provider === "r2" ? r2.signedStreamUrl(key, contentType) : sb.signedStreamUrl(key);
export const headObject = (key: string) => (provider === "r2" ? r2.headObject(key) : sb.headObject(key));
export const deleteObject = (key: string) => (provider === "r2" ? r2.deleteObject(key) : sb.deleteObject(key));
