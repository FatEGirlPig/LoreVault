import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { Logo, StorageMeter } from "@/components/ui";
import { capacityOf } from "@/lib/storage/quota";

const NAV = [
  ["/dashboard", "Dashboard"], ["/library", "Library"], ["/collections", "Collections"], ["/vault", "Vault"],
  ["/connections", "Connections"], ["/friends", "Friends"], ["/billing", "Billing"], ["/settings", "Settings"],
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: quota }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("storage_quotas").select("*").eq("user_id", user.id).single(),
    supabase.from("storage_usage").select("used_bytes").eq("user_id", user.id).single(),
  ]);
  return (
    <div className="md:flex">
      <aside className="border-b border-line bg-void/60 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4"><Logo /></div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:pb-0" aria-label="Main">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-mute hover:bg-panel hover:text-ink">{label}</Link>
          ))}
        </nav>
        <div className="hidden space-y-3 p-4 md:absolute md:bottom-0 md:block md:w-60">
          {quota && usage && <StorageMeter used={Number(usage.used_bytes)} capacity={capacityOf(quota)} compact />}
          <div className="flex items-center justify-between text-xs text-mute">
            <span className="truncate">{profile?.username ? `@${profile.username}` : user.email}</span>
            <form action={signOut}><button className="hover:text-ink">Log out</button></form>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
