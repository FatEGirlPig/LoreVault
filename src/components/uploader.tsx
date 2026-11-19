"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { name: string; progress: number; error?: string; done?: boolean };

export function VaultUploader() {
  const [items, setItems] = useState<Item[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const set = (i: number, p: Partial<Item>) => setItems((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function upload(files: FileList) {
    const start = items.length;
    setItems((s) => [...s, ...Array.from(files, (f) => ({ name: f.name, progress: 0 }))]);
    await Promise.all(Array.from(files).map(async (file, k) => {
      const i = start + k;
      const r = await fetch("/api/vault/upload", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }) });
      const j = await r.json();
      if (!r.ok) return set(i, { error: j.error });
      const ok = await new Promise<boolean>((resolve) => {
        const x = new XMLHttpRequest();
        x.open("PUT", j.url);
        x.setRequestHeader("Content-Type", file.type);
        x.upload.onprogress = (e) => e.lengthComputable && set(i, { progress: Math.round((e.loaded / e.total) * 100) });
        x.onload = () => resolve(x.status < 300);
        x.onerror = () => resolve(false);
        x.send(file);
      });
      if (!ok) return set(i, { error: "Upload failed. Check your connection and try again." });
      const c = await fetch("/api/vault/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: j.id }) });
      if (!c.ok) return set(i, { error: (await c.json()).error });
      set(i, { done: true, progress: 100 });
    }));
    router.refresh();
  }

  return (
    <div className="card">
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-8 text-center hover:border-cyan"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
      >
        <p className="font-semibold">Drop screenshots, clips, notes or PDFs here</p>
        <p className="text-xs text-mute">PNG, JPG, WebP, GIF, MP4, WebM, TXT, MD, PDF · up to 2 GB each · private by default</p>
        <button type="button" className="btn-ghost mt-2" onClick={() => input.current?.click()}>Choose files</button>
        <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files?.length && upload(e.target.files)}
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,text/plain,text/markdown,.md,application/pdf" />
      </div>
      {items.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" aria-live="polite">
          {items.map((it, i) => (
            <li key={i}>
              <div className="flex justify-between"><span className="truncate">{it.name}</span>
                <span className={it.error ? "text-red-300" : it.done ? "text-cyan" : "text-mute"}>{it.error ?? (it.done ? "Saved" : `${it.progress}%`)}</span></div>
              {!it.error && !it.done && <div className="mt-1 h-1 rounded bg-navy"><div className="h-1 rounded bg-cyan" style={{ width: `${it.progress}%` }} /></div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
