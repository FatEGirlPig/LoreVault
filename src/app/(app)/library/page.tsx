import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { addManualGame, importCsv } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Empty, PLATFORM_LABEL, SOURCE_LABEL } from "@/components/ui";
import { PLATFORMS } from "@/lib/integrations";
export const metadata = { title: "Library" };

const STATUSES = ["unplayed", "playing", "completed", "dropped", "wishlist"];
const SORTS: Record<string, [string, boolean]> = {
  recent: ["created_at", false], title: ["games(title)", true], playtime: ["playtime_minutes", false],
};

export default async function Library({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  let q = supabase.from("user_games")
    .select("id, platform, source, status, playtime_minutes, games!inner(title, cover_url)")
    .eq("user_id", user.id);
  if (sp.q) q = q.ilike("games.title", `%${sp.q.replace(/[%_]/g, "")}%`);
  if (sp.platform) q = q.eq("platform", sp.platform);
  if (sp.status) q = q.eq("status", sp.status);
  const [col, asc] = SORTS[sp.sort] ?? SORTS.recent;
  const { data: games } = col.startsWith("games(")
    ? await q.order("title", { referencedTable: "games", ascending: asc }).limit(500)
    : await q.order(col, { ascending: asc, nullsFirst: false }).limit(500);
  const rows = (games ?? []).map((g) => ({ ...g, game: g.games as unknown as { title: string; cover_url: string | null } }));
  if (sp.sort === "title") rows.sort((a, b) => a.game.title.localeCompare(b.game.title));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><h1 className="h1">Library</h1>
        <span className="text-sm text-mute">{rows.length} games</span></div>

      <form className="card grid gap-3 sm:grid-cols-5" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search titles…" className="input sm:col-span-2" aria-label="Search" />
        <select name="platform" defaultValue={sp.platform ?? ""} className="input" aria-label="Platform">
          <option value="">All platforms</option>{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""} className="input" aria-label="Status">
          <option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <div className="flex gap-2">
          <select name="sort" defaultValue={sp.sort ?? "recent"} className="input" aria-label="Sort">
            <option value="recent">Recent</option><option value="title">Title</option><option value="playtime">Playtime</option></select>
          <button className="btn-ghost">Apply</button></div>
      </form>

      {rows.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((g) => (
            <li key={g.id}><Link href={`/library/${g.id}`} className="card block h-full overflow-hidden p-0 transition hover:border-violet">
              {g.game.cover_url
                ? <img src={g.game.cover_url} alt="" className="aspect-[46/21] w-full object-cover" loading="lazy" />
                : <div className="flex aspect-[46/21] items-center justify-center bg-navy font-display text-2xl text-violet">{g.game.title[0]}</div>}
              <div className="p-3"><p className="truncate font-semibold">{g.game.title}</p>
                <div className="mt-1 flex flex-wrap gap-1"><span className="badge">{PLATFORM_LABEL[g.platform] ?? g.platform}</span>
                  <span className="badge">{SOURCE_LABEL[g.source]}</span>
                  {g.playtime_minutes ? <span className="badge">{Math.round(g.playtime_minutes / 60)}h</span> : null}</div></div>
            </Link></li>
          ))}
        </ul>
      ) : <Empty title={sp.q || sp.platform || sp.status ? "No games match those filters" : "Your library is empty"}>
          <Link href="/connections" className="text-cyan">Connect Steam</Link> or add a game below.</Empty>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h2 className="mb-3 font-display font-bold">Add a game manually</h2>
          <ActionForm action={addManualGame} className="grid gap-3 sm:grid-cols-2">
            <input name="title" required maxLength={200} placeholder="Game title" className="input sm:col-span-2" aria-label="Title" />
            <select name="platform" className="input" aria-label="Platform">{PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select name="status" className="input" aria-label="Status">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <Submit className="btn-primary sm:col-span-2">Add game</Submit>
          </ActionForm></div>
        <div className="card"><h2 className="mb-1 font-display font-bold">Import from CSV</h2>
          <p className="mb-3 text-xs text-mute">Columns: <code>title</code> (required), <code>platform</code> (optional). Imported titles are labeled as manual entries.</p>
          <ActionForm action={importCsv}>
            <input type="file" name="file" accept=".csv,text/csv" required className="input" aria-label="CSV file" />
            <Submit className="btn-ghost">Import</Submit>
          </ActionForm></div>
      </div>
    </div>
  );
}
