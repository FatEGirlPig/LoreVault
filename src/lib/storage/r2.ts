import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;
function r2() {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
  return client;
}
const Bucket = () => process.env.R2_BUCKET!;
const TTL = 300; // seconds

export const signedUploadUrl = (Key: string, ContentType: string, ContentLength: number) =>
  getSignedUrl(r2(), new PutObjectCommand({ Bucket: Bucket(), Key, ContentType, ContentLength }), { expiresIn: TTL });

export const signedDownloadUrl = (Key: string, filename: string) =>
  getSignedUrl(r2(), new GetObjectCommand({
    Bucket: Bucket(), Key, ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, "")}"`,
  }), { expiresIn: TTL });

/** Inline (playable) URL for videos and images, valid for an hour so players can seek. */
export const signedStreamUrl = (Key: string, ContentType: string) =>
  getSignedUrl(r2(), new GetObjectCommand({ Bucket: Bucket(), Key, ResponseContentType: ContentType, ResponseContentDisposition: "inline" }), { expiresIn: 3600 });

export async function headObject(Key: string) {
  try {
    const h = await r2().send(new HeadObjectCommand({ Bucket: Bucket(), Key }));
    return { size: h.ContentLength ?? 0, contentType: h.ContentType ?? "" };
  } catch { return null; }
}

export const deleteObject = (Key: string) => r2().send(new DeleteObjectCommand({ Bucket: Bucket(), Key }));
