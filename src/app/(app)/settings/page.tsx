import { requireUser } from "@/lib/supabase/server";
import { deleteAccount, updateCustomization, updatePassword, updatePrivacy, updateProfile } from "@/app/actions";
import { loadStats } from "@/lib/stats";
import { ActionForm, Submit } from "@/components/forms";
import { Notice, VisibilitySelect } from "@/components/ui";
import { SoundSettings } from "@/components/sound";
export const metadata = { title: "Settings" };

const PRIVACY: [string, string][] = [
  ["profile", "Profile page"], ["library", "Gaming library"], ["connected_accounts", "Connected accounts"], ["media_default", "New clips (default)"],
  ["notes", "Game notes"], ["collections_default", "New collections (default)"], ["friends_list", "Friends list"], ["activity", "Activity"],
];

export default async function Settings({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: privacy }, { data: top }, full] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("privacy_settings").select("*").eq("user_id", user.id).single(),
    supabase.from("user_games").select("id, game_id, playtime_minutes, games(title)").eq("user_id", user.id).order("playtime_minutes", { ascending: false, nullsFirst: false }).limit(40),
    loadStats(supabase, user.id),
  ]);
  const topGames = (top ?? []).map((t) => ({ id: t.id, gameId: t.game_id, title: (t.games as unknown as { title: string }).title, h: Math.round((t.playtime_minutes ?? 0) / 60) }));
  const showcase = new Set((profile?.showcase as string[] | undefined) ?? []);
  const pinnedKeys = new Set(((profile?.pinned as { ugId: string; id: string }[] | undefined) ?? []).map((p) => `${p.ugId}:${p.id}`));
  const rarest = full.rarest.slice(0, 24);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="h1">Settings</h1>
      <Notice params={sp} />
      <section className="card"><h2 className="mb-4 font-display font-bold">Profile</h2>
        <ActionForm action={updateProfile} className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Username</span><input name="username" required pattern="[a-z0-9_]{3,24}" defaultValue={profile?.username ?? ""} className="input" /></label>
          <label><span className="label">Display name</span><input name="display_name" maxLength={50} defaultValue={profile?.display_name ?? ""} className="input" /></label>
          <label className="sm:col-span-2"><span className="label">Bio</span><textarea name="bio" maxLength={500} rows={3} defaultValue={profile?.bio ?? ""} className="input" /></label>
          <div className="flex items-end"><Submit>Save profile</Submit></div>
        </ActionForm>
        {profile?.username && profile.visibility !== "private" && <p className="mt-3 text-xs text-mute">Your profile: /profile/{profile.username}</p>}
        {profile?.username && (profile.visibility === "public" && privacy?.library === "public"
          ? <div className="mt-4 space-y-2"><p className="label">Your shareable stats card</p>
              <img src={`/api/card/${profile.username}`} alt="Your LoreVault stats card" className="w-full max-w-lg rounded-xl border border-line" loading="lazy" />
              <div className="flex gap-2"><a href={`/api/card/${profile.username}`} download={`lorevault-${profile.username}.png`} className="btn-ghost">Download card</a>
                <a href={`/profile/${profile.username}`} className="btn-ghost">View profile</a></div>
              <p className="text-xs text-mute">Paste your profile link in Discord or X and this card shows up automatically.</p></div>
          : <p className="mt-3 text-xs text-mute">Set your profile and library to Public to get a shareable stats card.</p>)}
      </section>

      <section className="card"><h2 className="mb-1 font-display font-bold">Privacy</h2>
        <p className="mb-4 text-sm text-mute">Your profile is public by default so friends can find you and you appear on leaderboards. Change anything here.</p>
        <ActionForm action={updatePrivacy} className="grid gap-4 sm:grid-cols-2">
          {PRIVACY.map(([k, l]) => <VisibilitySelect key={k} name={k} label={l} value={k === "profile" ? profile?.visibility ?? "private" : (privacy as Record<string, string> | null)?.[k] ?? "private"} />)}
          <p className="text-xs text-mute sm:col-span-2">To appear on the global leaderboard and get a shareable stats card, set both Profile page and Gaming library to Public.</p>
          <div className="flex items-end"><Submit>Save privacy</Submit></div>
        </ActionForm></section>

      <section id="look" className="card"><h2 className="mb-1 font-display font-bold">Profile look</h2>
        <p className="mb-4 text-sm text-mute">Make your public profile yours.</p>
        <ActionForm action={updateCustomization} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">Accent colour</span><input type="color" name="accent" defaultValue={profile?.accent ?? "#8b5cf6"} className="h-10 w-full cursor-pointer rounded-xl border border-line bg-navy" /></label>
            <label><span className="label">Banner (game art)</span><select name="banner_game_id" defaultValue={profile?.banner_game_id ?? ""} className="input">
              <option value="">None</option>{topGames.map((g) => <option key={g.id} value={g.gameId}>{g.title}</option>)}</select></label>
          </div>
          <fieldset><legend className="label">Showcase games (up to 6)</legend>
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">{topGames.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="showcase" value={g.id} defaultChecked={showcase.has(g.id)} />
                <span className="truncate">{g.title}</span><span className="ml-auto text-xs text-mute">{g.h}h</span></label>))}</div></fieldset>
          {!!rarest.length && <fieldset><legend className="label">Pinned achievements (up to 3) · your rarest</legend>
            <div className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">{rarest.map((a) => (
              <label key={a.ugId + a.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="pinned" value={`${a.ugId}:${a.id}`} defaultChecked={pinnedKeys.has(`${a.ugId}:${a.id}`)} />
                <span className="truncate">{a.name}</span><span className="ml-auto shrink-0 text-xs text-mute">{a.globalPercent}% · {a.game}</span></label>))}</div></fieldset>}
          <p className="text-xs text-mute">Only the first 6 showcase games and first 3 achievements you tick are kept.</p>
          <Submit>Save look</Submit>
        </ActionForm>
      </section>

      <section id="sound" className="card"><h2 className="mb-4 font-display font-bold">Sound</h2><SoundSettings /></section>

      <section id="password" className="card"><h2 className="mb-4 font-display font-bold">Password</h2>
        <ActionForm action={updatePassword} className="flex flex-wrap gap-3">
          <input name="password" type="password" minLength={10} required placeholder="New password" autoComplete="new-password" className="input max-w-xs" aria-label="New password" />
          <Submit>Update password</Submit></ActionForm></section>

      <section className="card"><h2 className="mb-2 font-display font-bold">Your data</h2>
        <p className="mb-3 text-sm text-mute">Download a copy of your profile, library, collections, connections and file list.</p>
        <a href="/api/account/export" className="btn-ghost">Export data (JSON)</a></section>

      <section className="card border-red-500/40"><h2 className="mb-2 font-display font-bold text-red-300">Delete account</h2>
        <p className="mb-3 text-sm text-mute">Permanently deletes your account, library, achievements and clips. This cannot be undone.</p>
        <ActionForm action={deleteAccount} className="flex flex-wrap gap-3">
          <input name="confirm" placeholder='Type "DELETE"' className="input max-w-xs" aria-label="Confirm deletion" />
          <Submit className="btn-danger">Delete my account</Submit></ActionForm></section>
    </div>
  );
}
