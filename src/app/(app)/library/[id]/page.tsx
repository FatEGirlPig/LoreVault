import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { refreshAchievements, removeUserGame, toggleCollectionGame, updateUserGame } from "@/app/actions";
import { getAchievements } from "@/lib/integrations/achievements";
import { getStoreInfo } from "@/lib/integrations/store";
import { refreshDeck, refreshPrices } from "@/lib/integrations/market";
import { after } from "next/server";
import Link from "next/link";
import { Achievements } from "@/components/achievements";
import { ActionForm, ConfirmButton, Submit } from "@/components/forms";
import { PLATFORM_LABEL, SOURCE_LABEL } from "@/components/ui";

export default async function GameDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const { data: ug } = await supabase.from("user_games").select("*, games(*)").eq("id", id).eq("user_id", user.id).single();
  if (!ug) notFound();
  const game = ug.games as { id: string; title: string; cover_url: string | null; external_id: string | null };
  const [{ data: sources }, { data: collections }] = await Promise.all([
    supabase.from("user_games").select("platform, source, last_synced_at, games!inner(title)").eq("user_id", user.id).eq("games.title", game.title),
    supabase.from("collections").select("id, name, collection_games(game_id)").eq("user_id", user.id).order("position"),
  ]);
  const synced = ug.source !== "manual";
  const [ach, store] = await Promise.all([
    ug.platform === "steam" && ug.connected_account_id ? getAchievements(user.id, ug.id) : null,
    getStoreInfo(game.id),
  ]);
  const [{ data: market }, { data: board }] = await Promise.all([
    supabase.from("games").select("price_cents, initial_price_cents, discount_percent, currency, is_free, deck_status, price_checked_at, deck_checked_at").eq("id", game.id).single(),
    supabase.rpc("game_leaderboard", { gid: game.id }),
  ]);
  if (ug.platform === "steam" && (!market?.price_checked_at || !market?.deck_checked_at)) after(async () => { await refreshPrices([game.id]); await refreshDeck([game.id]); });
  const DECK: Record<number, [string, string]> = { 3: ["✅ Steam Deck Verified", "border-cyan text-cyan"], 2: ["🟡 Steam Deck Playable", "border-amber-400 text-amber-300"], 1: ["⛔ Not supported on Steam Deck", "border-red-500/50 text-red-300"] };
  const deck = market?.deck_status ? DECK[market.deck_status] : null;
  const price = market?.is_free ? "Free to play" : market?.price_cents != null ? `${(market.price_cents / 100).toFixed(2)} ${market.currency ?? ""}` : null;
  const ranks = ((board ?? []) as { user_id: string; username: string; unlocked: number; total: number; minutes: number }[]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-line">
        {store?.background_url && <img src={store.background_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row">
          {game.cover_url && <img src={game.cover_url} alt="" className="w-full rounded-xl shadow-lg sm:w-80" />}
          <div className="min-w-0 space-y-2">
            {store?.description && <p className="text-sm">{store.description}</p>}
            {!!store?.genres?.length && <div className="flex flex-wrap gap-1">{store.genres.map((g) => <span key={g} className="badge bg-void/60">{g}</span>)}</div>}
            <p className="text-xs text-mute">{[store?.developer, store?.release_date].filter(Boolean).join(" · ")}</p>
            <div className="flex flex-wrap gap-2">
              {deck && <span className={`badge bg-void/60 ${deck[1]}`}>{deck[0]}</span>}
              {price && <span className="badge bg-void/60">{market?.discount_percent ? <><span className="mr-1 text-cyan">-{market.discount_percent}%</span>{price}</> : price}</span>}
            </div>
            {game.external_id && ug.platform === "steam" && <a href={`https://store.steampowered.com/app/${game.external_id}`} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-cyan hover:underline">View on Steam ↗</a>}
          </div>
        </div>
      </div>
      {!!store?.screenshots?.length && <div className="flex gap-2 overflow-x-auto pb-1">{store.screenshots.map((s) => (
        <img key={s} src={s} alt="" className="h-28 shrink-0 rounded-lg border border-line" loading="lazy" />))}</div>}
      <div><h1 className="h1">{game.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">{(sources ?? []).map((s, i) => (
          <span key={i} className="badge">{PLATFORM_LABEL[s.platform] ?? s.platform} · {SOURCE_LABEL[s.source]}
            {s.last_synced_at ? ` · ${new Date(s.last_synced_at).toLocaleDateString()}` : ""}</span>))}</div></div>

      {ach && (ach.total > 0 || ach.error) && (
        <section className="card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold">Achievements {ach.total > 0 && <span className="text-mute">· {ach.unlocked}/{ach.total}</span>}</h2>
            <form action={refreshAchievements}><input type="hidden" name="id" value={ug.id} />
              <Submit className="btn-ghost text-xs">Refresh</Submit></form>
          </div>
          {ach.error && <p role="alert" className="mb-3 text-sm text-amber-300">{ach.error}</p>}
          {ach.total > 0 && <Achievements items={ach.items} />}
          {ach.fetchedAt && <p className="mt-3 text-xs text-mute">Updated {new Date(ach.fetchedAt).toLocaleString()} · from Steam</p>}
        </section>
      )}
      {ach && ach.total === 0 && !ach.error && <p className="text-sm text-mute">This game has no Steam achievements.</p>}

      {ranks.length > 1 && <section className="card">
        <h2 className="mb-3 font-display font-bold">LoreVault leaderboard <span className="text-sm font-normal text-mute">· {ranks.length} players own this</span></h2>
        <ol className="divide-y divide-line">{ranks.slice(0, 10).map((r, i) => (
          <li key={r.user_id} className={`flex items-center gap-3 py-2 text-sm ${r.user_id === user.id ? "text-cyan" : ""}`}>
            <span className="w-7 text-center font-display">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
            <Link href={`/profile/${r.username}`} className="min-w-0 flex-1 truncate hover:text-cyan">{r.username}</Link>
            <span className="text-mute">{Math.round(r.minutes / 60)}h</span>
            <span className="w-24 text-right font-display">{r.total ? `${Math.round((r.unlocked / r.total) * 100)}% · ${r.unlocked}/${r.total}` : "—"}</span>
          </li>))}</ol>
      </section>}

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
          {!synced && <form action={removeUserGame}><input type="hidden" name="id" value={ug.id} />
            <ConfirmButton message="Remove this game from your library?">Remove from library</ConfirmButton></form>}
        </div>
      </div>
    </div>
  );
}
