import Link from "next/link";
import { Logo } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5">
        <Logo />
        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm sm:gap-3" aria-label="Main">
          <Link href="/features" className="hidden px-2 py-2 text-mute hover:text-ink sm:inline">Features</Link>
          <Link href="/leaderboard?scope=global" className="px-2 py-2 text-mute hover:text-ink">Explore</Link>
          {user ? <>
            <form action={signOut}><button className="px-2 py-2 text-mute hover:text-ink">Log out</button></form>
            <Link href="/dashboard" className="btn-primary">Enter LoreVault →</Link>
          </> : <>
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/signup" className="btn-primary">Sign up free</Link>
          </>}
        </nav>
      </header>
      <main className="page-enter flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-6xl border-t border-line px-4 py-8 text-xs text-mute">
        <div className="flex flex-wrap justify-between gap-4">
          <span>© {new Date().getFullYear()} LoreVault. Not affiliated with Valve or Steam.</span>
          <span className="flex gap-4"><Link href="/features">Features</Link><Link href="/signup">Sign up</Link></span>
        </div>
      </footer>
    </div>
  );
}
