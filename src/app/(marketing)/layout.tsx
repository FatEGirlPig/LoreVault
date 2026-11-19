import Link from "next/link";
import { Logo } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5">
        <Logo />
        <nav className="flex items-center gap-1 text-sm sm:gap-4">
          <Link href="/features" className="hidden px-2 text-mute hover:text-ink sm:inline">Features</Link>
          <Link href="/pricing" className="px-2 text-mute hover:text-ink">Pricing</Link>
          {user ? <Link href="/dashboard" className="btn-primary">Open app</Link> : <>
            <Link href="/login" className="px-2 text-mute hover:text-ink">Log in</Link>
            <Link href="/signup" className="btn-primary">Get started free</Link></>}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="mx-auto w-full max-w-6xl border-t border-line px-4 py-8 text-xs text-mute">
        <div className="flex flex-wrap justify-between gap-4">
          <span>© {new Date().getFullYear()} LoreVault. Not affiliated with any gaming platform.</span>
          <span className="flex gap-4"><Link href="/features">Features</Link><Link href="/pricing">Pricing</Link></span>
        </div>
      </footer>
    </div>
  );
}
