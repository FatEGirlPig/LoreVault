import { requireUser } from "@/lib/supabase/server";
import { deleteMedia, updateMedia } from "@/app/actions";
import { AutoSelect, ConfirmButton } from "@/components/forms";
import { Empty, StorageMeter } from "@/components/ui";
import { VaultUploader } from "@/components/uploader";
import { capacityOf } from "@/lib/storage/quota";
import { formatBytes } from "@/lib/plans";
export const metadata = { title: "Vault" };

const CATS = ["screenshot", "video", "note", "document", "other"];

export default async function Vault({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  let q = supabase.from("media_files").select("*").eq("owner_id", user.id).eq("status", "ready").order("created_at", { ascending: false });
  if (sp.category) q = q.eq("category", sp.category);
  const [{ data: files }, { data: quota }, { data: usage }] = await Promise.all([
    q.limit(500),
    supabase.from("storage_quotas").select("*").eq("user_id", user.id).single(),
    supabase.from("storage_usage").select("*").eq("user_id", user.id).single(),
  ]);
  const cats = (usage?.by_category ?? {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <h1 className="h1">Vault</h1>
      <div className="card space-y-3">
        {quota && usage && <StorageMeter used={Number(usage.used_bytes)} capacity={capacityOf(quota)} />}
        <div className="flex flex-wrap gap-2 text-xs">{Object.entries(cats).map(([k, v]) => <span key={k} className="badge">{k}: {formatBytes(Number(v))}</span>)}</div>
        {quota?.grace_until && <p role="alert" className="text-sm text-amber-300">
          You&apos;re over your storage limit, so new uploads are paused. Your files remain available. Delete or export files, or upgrade, before {new Date(quota.grace_until).toLocaleDateString()}.</p>}
      </div>
      <VaultUploader />
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Categories">
        <a href="/vault" className={`badge ${!sp.category ? "border-cyan text-cyan" : ""}`}>All</a>
        {CATS.map((c) => <a key={c} href={`/vault?category=${c}`} className={`badge ${sp.category === c ? "border-cyan text-cyan" : ""}`}>{c}</a>)}
      </nav>
      {files?.length ? (
        <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm">
          <thead className="text-mute"><tr><th className="p-3">File</th><th className="p-3">Type</th><th className="p-3">Size</th><th className="p-3">Visibility</th><th className="p-3" /></tr></thead>
          <tbody>{files.map((f) => (
            <tr key={f.id} className="border-t border-line">
              <td className="max-w-xs truncate p-3"><a href={`/api/vault/${f.id}/download`} className="hover:text-cyan">{f.filename}</a></td>
              <td className="p-3 text-mute">{f.category}</td><td className="p-3 text-mute">{formatBytes(Number(f.size_bytes))}</td>
              <td className="p-3"><form action={updateMedia}><input type="hidden" name="id" value={f.id} />
                <AutoSelect name="visibility" defaultValue={f.visibility} aria-label="Visibility">
                  <option value="private">Only me</option><option value="friends">Friends</option><option value="public">Public</option></AutoSelect></form></td>
              <td className="p-3"><form action={deleteMedia}><input type="hidden" name="id" value={f.id} />
                <ConfirmButton message={`Permanently delete ${f.filename}?`} className="text-xs text-red-300 hover:underline">Delete</ConfirmButton></form></td>
            </tr>))}</tbody>
        </table></div>
      ) : <Empty title="Your Vault is empty">Upload your first screenshot above. Files are private unless you share them.</Empty>}
    </div>
  );
}
