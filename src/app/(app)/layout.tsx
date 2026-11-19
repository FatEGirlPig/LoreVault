import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { Logo } from "@/components/ui";
import { SideNav } from "@/components/side-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count: unread }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  return (
    <div className="md:flex">
      <aside className="border-b border-line bg-void/60 md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4"><Logo />
          <form action={signOut} className="md:hidden"><button className="btn-ghost">Log out</button></form></div>
        <SideNav unread={unread ?? 0} />
        <div className="mt-auto hidden items-center justify-between p-4 text-xs text-mute md:flex">
          <span className="truncate">{profile?.username ? `@${profile.username}` : user.email}</span>
          <form action={signOut}><button className="hover:text-ink">Log out</button></form>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
