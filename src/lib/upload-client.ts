/** PUT a file to a signed URL with progress. Supabase Storage expects multipart form data; R2 expects the raw body. */
export function putFile(url: string, mode: string, file: File, onProgress: (pct: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    x.onload = () => resolve(x.status < 300);
    x.onerror = () => resolve(false);
    if (mode === "supabase") {
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", file);
      x.send(body);
    } else {
      x.setRequestHeader("Content-Type", file.type);
      x.send(file);
    }
  });
}
