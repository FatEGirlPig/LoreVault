import Link from "next/link";
import { Logo } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import { SwitchTarget } from "@/components/switch-target";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getUser();
  const { data: p } = user ? await supabase.from("profiles").select("username").eq("id", user.id).single() : { data: null };
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <div className="card w-full max-w-sm">
        {user ? (
          <div className="space-y-4">
            <h1 className="font-display text-xl font-bold">You&apos;re already logged in</h1>
            <p className="text-sm text-mute">Signed in as <b className="text-ink">{p?.username ? `@${p.username}` : user.email}</b>.</p>
            <Link href="/dashboard" className="btn-primary w-full">Continue as {p?.username ?? "this account"}</Link>
            <form action={signOut}><SwitchTarget /><button className="btn-ghost w-full">Log out and use a different account</button></form>
          </div>
        ) : children}
      </div>
    </main>
  );
}
