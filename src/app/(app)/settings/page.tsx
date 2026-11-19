import { requireUser } from "@/lib/supabase/server";
import { deleteAccount, updatePassword, updatePrivacy, updateProfile } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { VisibilitySelect } from "@/components/ui";
export const metadata = { title: "Settings" };

const PRIVACY: [string, string][] = [
  ["library", "Gaming library"], ["connected_accounts", "Connected accounts"], ["media_default", "New Vault files (default)"],
  ["notes", "Game notes"], ["collections_default", "New collections (default)"], ["friends_list", "Friends list"], ["activity", "Activity"],
];

export default async function Settings() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: privacy }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("privacy_settings").select("*").eq("user_id", user.id).single(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="h1">Settings</h1>
      <section className="card"><h2 className="mb-4 font-display font-bold">Profile</h2>
        <ActionForm action={updateProfile} className="grid gap-4 sm:grid-cols-2">
          <label><span className="label">Username</span><input name="username" required pattern="[a-z0-9_]{3,24}" defaultValue={profile?.username ?? ""} className="input" /></label>
          <label><span className="label">Display name</span><input name="display_name" maxLength={50} defaultValue={profile?.display_name ?? ""} className="input" /></label>
          <label className="sm:col-span-2"><span className="label">Bio</span><textarea name="bio" maxLength={500} rows={3} defaultValue={profile?.bio ?? ""} className="input" /></label>
          <VisibilitySelect name="visibility" value={profile?.visibility ?? "private"} label="Who can see your profile" />
          <div className="flex items-end"><Submit>Save profile</Submit></div>
        </ActionForm>
        {profile?.username && profile.visibility !== "private" && <p className="mt-3 text-xs text-mute">Your profile: /profile/{profile.username}</p>}
      </section>

      <section className="card"><h2 className="mb-1 font-display font-bold">Privacy</h2>
        <p className="mb-4 text-sm text-mute">Everything starts private. Choose exactly what others can see.</p>
        <ActionForm action={updatePrivacy} className="grid gap-4 sm:grid-cols-2">
          {PRIVACY.map(([k, l]) => <VisibilitySelect key={k} name={k} label={l} value={(privacy as Record<string, string> | null)?.[k] ?? "private"} />)}
          <div className="flex items-end"><Submit>Save privacy</Submit></div>
        </ActionForm></section>

      <section id="password" className="card"><h2 className="mb-4 font-display font-bold">Password</h2>
        <ActionForm action={updatePassword} className="flex flex-wrap gap-3">
          <input name="password" type="password" minLength={10} required placeholder="New password" autoComplete="new-password" className="input max-w-xs" aria-label="New password" />
          <Submit>Update password</Submit></ActionForm></section>

      <section className="card"><h2 className="mb-2 font-display font-bold">Your data</h2>
        <p className="mb-3 text-sm text-mute">Download a copy of your profile, library, collections, connections and file list.</p>
        <a href="/api/account/export" className="btn-ghost">Export data (JSON)</a></section>

      <section className="card border-red-500/40"><h2 className="mb-2 font-display font-bold text-red-300">Delete account</h2>
        <p className="mb-3 text-sm text-mute">Permanently deletes your account, library, Vault files and cancels any subscription. This cannot be undone.</p>
        <ActionForm action={deleteAccount} className="flex flex-wrap gap-3">
          <input name="confirm" placeholder='Type "DELETE"' className="input max-w-xs" aria-label="Confirm deletion" />
          <Submit className="btn-danger">Delete my account</Submit></ActionForm></section>
    </div>
  );
}
