import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { removeUserGame, toggleCollectionGame, updateUserGame } from "@/app/actions";
import { ActionForm, ConfirmButton, Submit } from "@/components/forms";
import { PLATFORM_LABEL, SOURCE_LABEL } from "@/components/ui";

export default async function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: ug } = await supabase.from("user_games").select("*, games(*)").eq("id", id).eq("user_id", user.id).single();
  if (!ug) notFound();
  const game = ug.games as { id: string; title: string; cover_url: string | null; external_id: string | null };
  const [{ data: sources }, { data: collections }, { data: media }] = await Promise.all([
    supabase.from("user_games").select("platform, source, last_synced_at, games!inner(title)").eq("user_id", user.id).eq("games.title", game.title),
    supabase.from("collections").select("id, name, collection_games(game_id)").eq("user_id", user.id).order("position"),
    supabase.from("media_files").select("id, filename").eq("owner_id", user.id).eq("game_id", game.id),
  ]);
  const synced = ug.source !== "manual";

  return (
    <div className="space-y-6">
      {game.cover_url && <img src={game.cover_url} alt="" className="max-h-56 w-full rounded-2xl object-cover" />}
      <div><h1 className="h1">{game.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">{(sources ?? []).map((s, i) => (
          <span key={i} className="badge">{PLATFORM_LABEL[s.platform] ?? s.platform} · {SOURCE_LABEL[s.source]}
            {s.last_synced_at ? ` · ${new Date(s.last_synced_at).toLocaleDateString()}` : ""}</span>))}</div></div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2"><h2 className="mb-3 font-display font-bold">Tracking</h2>
          <ActionForm action={updateUserGame} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="id" value={ug.id} />
            <label><span className="label">Status</span><select name="status" defaultValue={ug.status} className="input">
              {["unplayed", "playing", "completed", "dropped", "wishlist"].map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="label">Rating (1–10)</span><input name="rating" type="number" min={1} max={10} defaultValue={ug.rating ?? ""} className="input" /></label>
            <label><span className="label">Playtime (hours)</span>
              <input name="playtime_hours" type="number" step="0.5" min={0} disabled={synced} className="input"
                defaultValue={ug.playtime_minutes != null ? (ug.playtime_minutes / 60).toFixed(1) : ""} />
              {synced && <span className="mt-1 block text-xs text-mute">Provided by {PLATFORM_LABEL[ug.platform]}</span>}</label>
            <label className="sm:col-span-3"><span className="label">Private notes</span>
              <textarea name="notes" rows={5} maxLength={10000} defaultValue={ug.notes ?? ""} className="input" /></label>
            <Submit className="btn-primary sm:w-fit">Save</Submit>
          </ActionForm></div>

        <div className="space-y-4">
          <div className="card"><h2 className="mb-3 font-display font-bold">Collections</h2>
            {collections?.length ? <ul className="space-y-2">{collections.map((c) => {
              const inIt = (c.collection_games as { game_id: string }[]).some((x) => x.game_id === game.id);
              return <li key={c.id}><form action={toggleCollectionGame} className="flex items-center justify-between text-sm">
                <input type="hidden" name="collection_id" value={c.id} /><input type="hidden" name="game_id" value={game.id} />
                <input type="hidden" name="user_game_id" value={ug.id} /><input type="hidden" name="action" value={inIt ? "remove" : "add"} />
                <span>{c.name}</span><button className={inIt ? "text-cyan" : "text-mute hover:text-ink"}>{inIt ? "✓ Added" : "+ Add"}</button></form></li>;
            })}</ul> : <p className="text-sm text-mute">No collections yet.</p>}</div>
          {!!media?.length && <div className="card"><h2 className="mb-2 font-display font-bold">Vault files</h2>
            <ul className="text-sm">{media.map((m) => <li key={m.id}><a href={`/api/vault/${m.id}/download`} className="hover:text-cyan">{m.filename}</a></li>)}</ul></div>}
          {!synced && <form action={removeUserGame}><input type="hidden" name="id" value={ug.id} />
            <ConfirmButton message="Remove this game from your library?">Remove from library</ConfirmButton></form>}
        </div>
      </div>
    </div>
  );
}
