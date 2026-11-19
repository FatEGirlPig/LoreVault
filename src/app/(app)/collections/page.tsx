import { requireUser } from "@/lib/supabase/server";
import { createCollection, deleteCollection, moveCollection, toggleCollectionGame, updateCollection } from "@/app/actions";
import { ActionForm, AutoSelect, ConfirmButton, Submit } from "@/components/forms";
import { Empty } from "@/components/ui";
export const metadata = { title: "Collections" };

export default async function Collections() {
  const { supabase, user } = await requireUser();
  const { data: collections } = await supabase.from("collections")
    .select("*, collection_games(game_id, games(title))").eq("user_id", user.id).order("position");

  return (
    <div className="space-y-6">
      <h1 className="h1">Collections</h1>
      <div className="card"><ActionForm action={createCollection} className="flex flex-wrap items-center gap-3">
        <input name="name" required maxLength={80} placeholder="New collection name" className="input max-w-xs" aria-label="Collection name" />
        <label className="text-sm text-mute"><input type="checkbox" name="is_wishlist" className="mr-1" />Wishlist</label>
        <Submit>Create</Submit></ActionForm></div>
      {collections?.length ? <div className="space-y-4">{collections.map((c, i) => {
        const games = c.collection_games as { game_id: string; games: { title: string } }[];
        return (
          <div key={c.id} className="card">
            <div className="flex flex-wrap items-center gap-2">
              <form action={updateCollection} className="flex flex-1 gap-2"><input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} className="input max-w-xs font-semibold" aria-label="Rename" />
                <button className="btn-ghost">Rename</button></form>
              {c.is_wishlist && <span className="badge">Wishlist</span>}
              <form action={updateCollection}><input type="hidden" name="id" value={c.id} />
                <AutoSelect name="visibility" defaultValue={c.visibility} aria-label="Visibility">
                  <option value="private">Only me</option><option value="friends">Friends</option><option value="public">Public</option></AutoSelect></form>
              <form action={moveCollection}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" />
                <button disabled={i === 0} className="btn-ghost px-2" aria-label="Move up">↑</button></form>
              <form action={moveCollection}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" />
                <button disabled={i === collections.length - 1} className="btn-ghost px-2" aria-label="Move down">↓</button></form>
              <form action={deleteCollection}><input type="hidden" name="id" value={c.id} />
                <ConfirmButton message={`Delete “${c.name}”? Games stay in your library.`}>Delete</ConfirmButton></form>
            </div>
            {games.length ? <ul className="mt-3 flex flex-wrap gap-2">{games.map((g) => (
              <li key={g.game_id}><form action={toggleCollectionGame} className="badge gap-2">
                <input type="hidden" name="collection_id" value={c.id} /><input type="hidden" name="game_id" value={g.game_id} />
                <input type="hidden" name="action" value="remove" />{g.games.title}
                <button aria-label={`Remove ${g.games.title}`} className="hover:text-red-300">×</button></form></li>))}</ul>
              : <p className="mt-3 text-sm text-mute">Add games from a game&apos;s detail page.</p>}
          </div>);
      })}</div> : <Empty title="No collections yet">Group games into lists like “Backlog” or “All-time favorites”.</Empty>}
    </div>
  );
}
