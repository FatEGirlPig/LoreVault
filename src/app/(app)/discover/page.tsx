import Link from "next/link";
import { adminClient, requireUser } from "@/lib/supabase/server";
import { freeGames } from "@/lib/freegames";
import { Roulette } from "@/components/roulette";
import { Empty } from "@/components/ui";
export const metadata = { title: "Discover" };

const money = (c: number | null, cur: string | null) => c == null ? "" : c === 0 ? "Free" : `${(c / 100).toFixed(2)} ${cur ?? ""}`.trim();

export default async function Discover() {
  const { supabase, user } = await requireUser();
  const [{ data: backlog }, giveaways, { data: wish }, { data: f }] = await Promise.all([
    supabase.from("user_games").select("id, playtime_minutes, status, games(title, cover_url, genres)").eq("user_id", user.id)
      .neq("status", "completed").neq("status", "wishlist").or("playtime_minutes.is.null,playtime_minutes.lt.120").limit(2000),
    freeGames(),
    supabase.from("collection_games").select("games(id, title, cover_url, price_cents, initial_price_cents, discount_percent, currency, is_free), collections!inner(user_id, is_wishlist)")
      .eq("collections.user_id", user.id).eq("collections.is_wishlist", true),
    supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted"),
  ]);
  const friends = (f ?? []).map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id));
  const { data: playing } = friends.length ? await supabase.from("user_games").select("user_id, playtime_2weeks, game_id, games(title, cover_url)")
    .in("user_id", friends).gt("playtime_2weeks", 0).order("playtime_2weeks", { ascending: false }).limit(100) : { data: [] };
  const { data: names } = friends.length ? await adminClient().from("profiles").select("id, username").in("id", friends) : { data: [] };
  const byGame = new Map<string, { title: string; cover: string | null; players: string[]; minutes: number }>();
  for (const p of playing ?? []) {
    const g = p.games as unknown as { title: string; cover_url: string | null };
    const e = byGame.get(p.game_id) ?? { title: g.title, cover: g.cover_url, players: [], minutes: 0 };
    e.players.push(names?.find((n) => n.id === p.user_id)?.username ?? "friend"); e.minutes += p.playtime_2weeks ?? 0; byGame.set(p.game_id, e);
  }
  const trending = [...byGame.values()].sort((a, b) => b.players.length - a.players.length || b.minutes - a.minutes).slice(0, 8);
  const wishlist = (wish ?? []).map((w) => w.games as unknown as { id: string; title: string; cover_url: string | null; price_cents: number | null; initial_price_cents: number | null; discount_percent: number | null; currency: string | null; is_free: boolean | null })
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0));
  const pool = (backlog ?? []).map((b) => { const g = b.games as unknown as { title: string; cover_url: string | null; genres: string[] | null }; return { id: b.id, title: g.title, cover: g.cover_url, genres: g.genres ?? [], minutes: b.playtime_minutes ?? 0 }; });

  return (
    <div className="space-y-8">
      <h1 className="h1">Discover</h1>
      <section><h2 className="mb-3 font-display font-bold">🎲 Backlog roulette</h2><Roulette games={pool} /></section>

      <section><h2 className="mb-3 font-display font-bold">👥 Friends are playing</h2>
        {trending.length ? <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{trending.map((t) => (
          <li key={t.title} className="card overflow-hidden p-0">
            {t.cover && <img src={t.cover} alt="" className="aspect-[46/21] w-full object-cover" loading="lazy" />}
            <div className="p-3"><p className="truncate font-semibold">{t.title}</p>
              <p className="truncate text-xs text-mute">{t.players.slice(0, 3).map((p) => `@${p}`).join(", ")}{t.players.length > 3 ? ` +${t.players.length - 3}` : ""} · {Math.round(t.minutes / 60)}h this fortnight</p></div>
          </li>))}</ul> : <Empty title="Nothing yet">Shows what your friends played on Steam in the last two weeks.</Empty>}
      </section>

      <section><h2 className="mb-3 font-display font-bold">💸 Your wishlist prices</h2>
        {wishlist.length ? <ul className="card divide-y divide-line p-0">{wishlist.map((g) => (
          <li key={g.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold">{g.title}</span>
            {!!g.discount_percent && <span className="badge border-cyan text-cyan">-{g.discount_percent}%</span>}
            {!!g.discount_percent && <s className="text-mute">{money(g.initial_price_cents, g.currency)}</s>}
            <span className="font-display">{g.is_free ? "Free" : money(g.price_cents, g.currency) || "—"}</span>
          </li>))}</ul>
          : <Empty title="No wishlist yet"><Link href="/collections" className="text-cyan">Create a collection</Link> and tick “Wishlist”. We check Steam prices daily and notify you when one drops.</Empty>}
      </section>

      <section><h2 className="mb-3 font-display font-bold">🎁 Free games right now</h2>
        {giveaways.length ? <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{giveaways.map((g) => (
          <li key={g.id}><a href={g.url} target="_blank" rel="noopener noreferrer" className="card block h-full overflow-hidden p-0 transition hover:border-violet">
            <img src={g.image} alt="" className="aspect-video w-full object-cover" loading="lazy" />
            <div className="p-3"><p className="line-clamp-2 text-sm font-semibold">{g.title}</p>
              <p className="text-xs text-mute">{g.worth !== "N/A" && <s className="mr-1">{g.worth}</s>}<span className="text-cyan">Free</span> · {g.platforms}</p>
              {g.endDate && <p className="text-[11px] text-mute">Ends {g.endDate}</p>}</div>
          </a></li>))}</ul> : <Empty title="Couldn't load giveaways">Try again later.</Empty>}
        <p className="mt-2 text-xs text-mute">Giveaway data from GamerPower.</p>
      </section>
    </div>
  );
}
