"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { putFile } from "@/lib/upload-client";

export function ClipUploader({ games }: { games: { id: string; title: string }[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<{ error?: string; ok?: string }>({});
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setStatus({ error: "Choose a video first." });
    const f = new FormData(e.currentTarget);
    setStatus({}); setProgress(0);
    const r = await fetch("/api/vault/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      filename: file.name, contentType: file.type, size: file.size, clip: true,
      title: f.get("title"), visibility: f.get("visibility"), gameId: f.get("gameId") || undefined, folder: "Clips" }) });
    const j = await r.json();
    if (!r.ok) { setProgress(null); return setStatus({ error: j.error }); }
    const ok = await putFile(j.url, j.mode, file, (p) => setProgress(p));
    if (!ok) { setProgress(null); return setStatus({ error: "Upload failed. Check your connection and try again." }); }
    const c = await fetch("/api/vault/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: j.id }) });
    setProgress(null);
    if (!c.ok) return setStatus({ error: (await c.json()).error });
    setStatus({ ok: "Clip posted!" }); setFile(null); (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="font-display font-bold sm:col-span-2">Share a clip</h2>
      <label className="sm:col-span-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line p-6 text-center hover:border-cyan">
        <span className="font-semibold">{file ? file.name : "Choose a gameplay clip"}</span>
        <span className="text-xs text-mute">MP4 or WebM · up to 50 MB · counts toward your storage</span>
        <input type="file" accept="video/mp4,video/webm" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <input name="title" maxLength={100} placeholder="Title (e.g. Clutch 1v4)" className="input sm:col-span-2" aria-label="Title" />
      <select name="gameId" className="input" aria-label="Game"><option value="">No game tagged</option>
        {games.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
      <select name="visibility" defaultValue="friends" className="input" aria-label="Who can see it">
        <option value="private">Only me</option><option value="friends">Friends</option><option value="public">Public</option></select>
      {progress !== null && <div className="sm:col-span-2 h-2 rounded bg-navy"><div className="h-2 rounded bg-cyan" style={{ width: `${progress}%` }} /></div>}
      {status.error && <p role="alert" className="sm:col-span-2 text-sm text-red-300">{status.error}</p>}
      {status.ok && <p role="status" className="sm:col-span-2 text-sm text-cyan">{status.ok}</p>}
      <button type="submit" disabled={progress !== null} className="btn-primary sm:col-span-2">{progress !== null ? `Uploading ${progress}%` : "Post clip"}</button>
    </form>
  );
}

export function CopyLink({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="text-xs text-mute hover:text-cyan" onClick={async () => {
    await navigator.clipboard.writeText(location.origin + path); setDone(true); setTimeout(() => setDone(false), 1500);
  }}>{done ? "Link copied" : "Copy link"}</button>;
}
