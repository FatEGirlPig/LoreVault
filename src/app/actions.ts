"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { adminClient, audit, createClient, requireUser } from "@/lib/supabase/server";
import { syncAccount } from "@/lib/integrations/sync";
import { getAchievements } from "@/lib/integrations/achievements";
import { deleteObject } from "@/lib/storage/r2";
import { capacityOf } from "@/lib/storage/quota";
import { addonPrice, planPrice, stripe } from "@/lib/billing/stripe";
import { rateLimit } from "@/lib/security/rate-limit";
import type { AddonId, Interval, PlanId } from "@/lib/plans";

export type FormState = { error?: string; message?: string } | undefined;
const site = () => process.env.NEXT_PUBLIC_SITE_URL!;
const vis = z.enum(["private", "friends", "public"]);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function ipKey(prefix: string) {
  const h = await headers();
  return `${prefix}:${h.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}`;
}

// ---------- Auth ----------
export async function signUp(_: FormState, f: FormData): Promise<FormState> {
  if (!rateLimit(await ipKey("signup"), 5, 600_000)) return { error: "Too many attempts. Try again later." };
  const email = str(f, "email"), password = String(f.get("password") ?? "");
  if (!z.email().safeParse(email).success) return { error: "Enter a valid email." };
  if (password.length < 10) return { error: "Password must be at least 10 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${site()}/auth/callback?next=/settings` } });
  if (error) return { error: error.message };
  return { message: "Check your email to verify your account." };
}

export async function signIn(_: FormState, f: FormData): Promise<FormState> {
  if (!rateLimit(await ipKey("login"), 10, 600_000)) return { error: "Too many attempts. Try again later." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(f, "email"), password: String(f.get("password") ?? "") });
  if (error) return { error: "Incorrect email or password, or email not yet verified." };
  const next = str(f, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function resetPassword(_: FormState, f: FormData): Promise<FormState> {
  if (!rateLimit(await ipKey("reset"), 5, 600_000)) return { error: "Too many attempts. Try again later." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(str(f, "email"), { redirectTo: `${site()}/auth/callback?next=/settings#password` });
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const password = String(f.get("password") ?? "");
  if (password.length < 10) return { error: "Password must be at least 10 characters." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  await audit(user.id, "account.password_changed");
  return { message: "Password updated." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------- Profile & privacy ----------
export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const username = str(f, "username").toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return { error: "Username: 3–24 lowercase letters, numbers or underscores." };
  const v = vis.safeParse(f.get("visibility"));
  const { error } = await supabase.from("profiles").update({
    username, display_name: str(f, "display_name").slice(0, 50) || null, bio: str(f, "bio").slice(0, 500) || null,
    visibility: v.success ? v.data : "private", updated_at: new Date().toISOString(),
  }).eq("id", user.id);
  if (error) { console.error("profile save failed", error); return { error: error.code === "23505" ? "That username is taken." : "Could not save profile. Please try again." }; }
  await audit(user.id, "profile.updated", { visibility: v.success ? v.data : "private" });
  revalidatePath("/settings");
  return { message: "Profile saved." };
}

export async function updatePrivacy(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const keys = ["library", "connected_accounts", "media_default", "notes", "collections_default", "friends_list", "activity"] as const;
  const patch: Record<string, string> = {};
  for (const k of keys) { const v = vis.safeParse(f.get(k)); if (v.success) patch[k] = v.data; }
  await supabase.from("privacy_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  await audit(user.id, "privacy.updated", patch);
  revalidatePath("/settings");
  return { message: "Privacy settings saved." };
}

export async function deleteAccount(_: FormState, f: FormData): Promise<FormState> {
  const { user } = await requireUser();
  if (str(f, "confirm") !== "DELETE") return { error: 'Type DELETE to confirm.' };
  const db = adminClient();
  const { data: files } = await db.from("media_files").select("object_key").eq("owner_id", user.id);
  for (const file of files ?? []) await deleteObject(file.object_key).catch(() => {});
  const { data: sub } = await db.from("subscriptions").select("stripe_subscription_id").eq("user_id", user.id).single();
  if (sub?.stripe_subscription_id) await stripe().subscriptions.cancel(sub.stripe_subscription_id).catch(() => {});
  await audit(user.id, "account.deleted");
  await db.auth.admin.deleteUser(user.id);
  await (await createClient()).auth.signOut();
  redirect("/?deleted=1");
}

// ---------- Library ----------
export async function addManualGame(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const title = str(f, "title"), platform = str(f, "platform") || "other";
  if (!title || title.length > 200) return { error: "Enter a title (up to 200 characters)." };
  const { data: game, error } = await supabase.from("games")
    .insert({ title, platform, source: "manual", created_by: user.id }).select("id").single();
  if (error) return { error: "Could not add game." };
  const { error: e2 } = await supabase.from("user_games").insert({
    user_id: user.id, game_id: game.id, platform, source: "manual", status: str(f, "status") || "unplayed",
  });
  if (e2) return { error: "Could not add game to your library." };
  revalidatePath("/library");
  return { message: `Added “${title}”.` };
}

export async function importCsv(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > 1_000_000) return { error: "CSV must be under 1 MB." };
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
  const header = lines.shift()?.toLowerCase().split(",").map((s) => s.trim()) ?? [];
  const ti = header.indexOf("title"), pi = header.indexOf("platform");
  if (ti < 0) return { error: 'CSV needs a "title" column (optional "platform").' };
  let added = 0;
  for (const line of lines.slice(0, 2000)) {
    const cols = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
    const title = cols[ti]?.slice(0, 200);
    if (!title) continue;
    const platform = (pi >= 0 && cols[pi]) || "other";
    const { data: g } = await supabase.from("games").insert({ title, platform, source: "manual", created_by: user.id }).select("id").single();
    if (g && !(await supabase.from("user_games").insert({ user_id: user.id, game_id: g.id, platform, source: "manual" })).error) added++;
  }
  revalidatePath("/library");
  return { message: `Imported ${added} games from CSV.` };
}

export async function updateUserGame(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const id = str(f, "id");
  const rating = Number(f.get("rating")) || null;
  const patch: Record<string, unknown> = {
    status: str(f, "status"), notes: str(f, "notes").slice(0, 10000) || null,
    rating: rating && rating >= 1 && rating <= 10 ? rating : null,
  };
  const pt = f.get("playtime_hours");
  if (pt !== null && pt !== "") patch.playtime_minutes = Math.max(0, Math.round(Number(pt) * 60)); // ignored by DB for synced rows
  const { error } = await supabase.from("user_games").update(patch).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Could not save." };
  revalidatePath(`/library/${id}`);
  return { message: "Saved." };
}

export async function removeUserGame(f: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("user_games").delete().eq("id", str(f, "id")).eq("user_id", user.id);
  redirect("/library");
}

export async function refreshAchievements(f: FormData) {
  const { user } = await requireUser();
  if (!rateLimit(`ach:${user.id}`, 20, 600_000)) return;
  await getAchievements(user.id, str(f, "id"), { force: true });
  revalidatePath(`/library/${str(f, "id")}`);
}

// ---------- Collections ----------
export async function createCollection(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const name = str(f, "name");
  if (!name || name.length > 80) return { error: "Name must be 1–80 characters." };
  const { data: p } = await supabase.from("privacy_settings").select("collections_default").eq("user_id", user.id).single();
  const { count } = await supabase.from("collections").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  await supabase.from("collections").insert({
    user_id: user.id, name, is_wishlist: f.get("is_wishlist") === "on", visibility: p?.collections_default ?? "private", position: count ?? 0,
  });
  revalidatePath("/collections");
  return { message: "Collection created." };
}

export async function updateCollection(f: FormData) {
  const { supabase, user } = await requireUser();
  const v = vis.safeParse(f.get("visibility"));
  const name = str(f, "name").slice(0, 80);
  await supabase.from("collections").update({ ...(name && { name }), ...(v.success && { visibility: v.data }) })
    .eq("id", str(f, "id")).eq("user_id", user.id);
  revalidatePath("/collections");
}

export async function moveCollection(f: FormData) {
  const { supabase, user } = await requireUser();
  const { data: list } = await supabase.from("collections").select("id, position").eq("user_id", user.id).order("position");
  if (!list) return;
  const i = list.findIndex((c) => c.id === str(f, "id")), j = i + (str(f, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((c, idx) => supabase.from("collections").update({ position: idx }).eq("id", c.id)));
  revalidatePath("/collections");
}

export async function deleteCollection(f: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("collections").delete().eq("id", str(f, "id")).eq("user_id", user.id);
  revalidatePath("/collections");
}

export async function toggleCollectionGame(f: FormData) {
  const { supabase } = await requireUser();
  const collection_id = str(f, "collection_id"), game_id = str(f, "game_id");
  if (f.get("action") === "remove") await supabase.from("collection_games").delete().match({ collection_id, game_id });
  else await supabase.from("collection_games").upsert({ collection_id, game_id });
  revalidatePath("/collections");
  revalidatePath(`/library/${str(f, "user_game_id")}`);
}

// ---------- Connections ----------
export async function syncConnection(f: FormData) {
  const { user } = await requireUser();
  if (!rateLimit(`sync:${user.id}`, 5, 600_000)) redirect("/connections?error=Sync+limit+reached.+Try+again+in+a+few+minutes");
  let q = "synced=1";
  try { const r = await syncAccount(user.id, str(f, "id")); q += `&imported=${r.imported}`; }
  catch (e) { q = `error=${encodeURIComponent(e instanceof Error ? e.message : "Sync failed")}`; }
  redirect(`/connections?${q}`);
}

export async function disconnectAccount(f: FormData) {
  const { user } = await requireUser();
  const db = adminClient();
  const id = str(f, "id");
  const { data: acc } = await db.from("connected_accounts").select("platform").eq("id", id).eq("user_id", user.id).single();
  if (!acc) return;
  if (f.get("remove_games") === "on")
    await db.from("user_games").delete().eq("user_id", user.id).eq("connected_account_id", id);
  await db.from("connected_accounts").delete().eq("id", id);
  await audit(user.id, "connection.removed", { platform: acc.platform });
  revalidatePath("/connections");
}

// ---------- Vault ----------
export async function deleteMedia(f: FormData) {
  const { user } = await requireUser();
  const db = adminClient();
  const { data: file } = await db.from("media_files").select("id, object_key").eq("id", str(f, "id")).eq("owner_id", user.id).single();
  if (!file) return;
  await deleteObject(file.object_key).catch(() => {});
  await db.from("media_files").delete().eq("id", file.id);
  // Lift the upload pause once the user is back under quota.
  const [{ data: q }, { data: u }] = await Promise.all([
    db.from("storage_quotas").select("*").eq("user_id", user.id).single(),
    db.from("storage_usage").select("used_bytes").eq("user_id", user.id).single(),
  ]);
  if (q?.grace_until && u && Number(u.used_bytes) <= capacityOf(q))
    await db.from("storage_quotas").update({ grace_until: null }).eq("user_id", user.id);
  revalidatePath("/vault");
  revalidatePath("/clips");
}

export async function updateMedia(f: FormData) {
  const { supabase, user } = await requireUser();
  const v = vis.safeParse(f.get("visibility"));
  if (v.success) await supabase.from("media_files").update({ visibility: v.data }).eq("id", str(f, "id")).eq("owner_id", user.id);
  revalidatePath("/vault");
  revalidatePath("/clips");
}

// ---------- Social ----------
export async function sendFriendRequest(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const username = str(f, "username").toLowerCase();
  // Look up by username without exposing private profiles' details.
  const { data: target } = await adminClient().from("profiles").select("id").eq("username", username).single();
  if (!target || target.id === user.id) return { error: "No user found with that username." };
  const { error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: target.id });
  if (error) return { error: error.code === "23505" ? "A request already exists." : "Could not send request." };
  revalidatePath("/friends");
  return { message: "Friend request sent." };
}

export async function respondFriend(f: FormData) {
  const { supabase, user } = await requireUser();
  const id = str(f, "id");
  if (f.get("action") === "accept")
    await supabase.from("friendships").update({ status: "accepted", responded_at: new Date().toISOString() }).eq("id", id).eq("addressee_id", user.id);
  else await supabase.from("friendships").delete().eq("id", id);
  revalidatePath("/friends");
}

export async function blockUser(f: FormData) {
  const { supabase, user } = await requireUser();
  const other = str(f, "user_id");
  await supabase.from("friendships").delete().or(`and(requester_id.eq.${user.id},addressee_id.eq.${other}),and(requester_id.eq.${other},addressee_id.eq.${user.id})`);
  await supabase.from("blocks").upsert({ blocker_id: user.id, blocked_id: other });
  await audit(user.id, "social.blocked", { user: other });
  revalidatePath("/friends");
}

export async function unblockUser(f: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("blocks").delete().match({ blocker_id: user.id, blocked_id: str(f, "user_id") });
  revalidatePath("/friends");
}

export async function reportUser(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const reason = str(f, "reason");
  if (reason.length < 3) return { error: "Describe the problem." };
  await supabase.from("reports").insert({ reporter_id: user.id, reported_user_id: str(f, "user_id"), reason: reason.slice(0, 1000) });
  return { message: "Report submitted. Thank you." };
}

// ---------- Billing ----------
async function customerFor(userId: string, email?: string) {
  const db = adminClient();
  const { data: sub } = await db.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).single();
  if (sub?.stripe_customer_id) return sub.stripe_customer_id;
  const c = await stripe().customers.create({ email, metadata: { user_id: userId } });
  await db.from("subscriptions").update({ stripe_customer_id: c.id }).eq("user_id", userId);
  return c.id;
}

export async function startCheckout(f: FormData) {
  const { user } = await requireUser();
  const plan = str(f, "plan") as Exclude<PlanId, "free">, interval = str(f, "interval") as Interval;
  const price = planPrice(plan, interval);
  if (!price) redirect("/billing?error=Plan+unavailable");
  const { data: sub } = await adminClient().from("subscriptions").select("stripe_subscription_id, status").eq("user_id", user.id).single();
  const customer = await customerFor(user.id, user.email);
  if (sub?.stripe_subscription_id && sub.status !== "canceled") {
    const s = await stripe().billingPortal.sessions.create({ customer, return_url: `${site()}/billing` });
    redirect(s.url); // plan changes for existing subscribers go through the portal
  }
  const session = await stripe().checkout.sessions.create({
    mode: "subscription", customer, line_items: [{ price, quantity: 1 }],
    success_url: `${site()}/billing?success=1`, cancel_url: `${site()}/billing`,
    subscription_data: { metadata: { user_id: user.id } },
  });
  redirect(session.url!);
}

export async function addStorageAddon(f: FormData) {
  const { user } = await requireUser();
  const addon = str(f, "addon") as AddonId;
  const price = addonPrice(addon);
  const { data: sub } = await adminClient().from("subscriptions").select("stripe_subscription_id, status").eq("user_id", user.id).single();
  if (!price || !sub?.stripe_subscription_id || sub.status === "canceled") redirect("/billing?error=Add-ons+require+a+paid+plan");
  await stripe().subscriptionItems.create({ subscription: sub.stripe_subscription_id, price, quantity: 1, proration_behavior: "create_prorations" });
  redirect("/billing?success=addon"); // entitlement updates when the webhook arrives
}

export async function openBillingPortal() {
  const { user } = await requireUser();
  const s = await stripe().billingPortal.sessions.create({ customer: await customerFor(user.id, user.email), return_url: `${site()}/billing` });
  redirect(s.url);
}
