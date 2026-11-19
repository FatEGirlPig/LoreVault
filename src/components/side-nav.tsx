"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/dashboard", "Dashboard"], ["/library", "Library"], ["/achievements", "Achievements"], ["/stats", "Stats"], ["/discover", "Discover"],
  ["/leaderboard", "Leaderboard"], ["/speedruns", "Speedruns"], ["/clips", "Clips"], ["/lfg", "Looking for Group"], ["/groups", "Groups"],
  ["/collections", "Collections"], ["/friends", "Friends"], ["/notifications", "Notifications"], ["/connections", "Steam"], ["/settings", "Settings"],
];

export function SideNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-y-auto md:pb-0" aria-label="Main">
      {NAV.map(([href, label]) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} prefetch aria-current={active ? "page" : undefined}
            className={`relative flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${active ? "bg-panel text-ink" : "text-mute hover:bg-panel/60 hover:text-ink"}`}>
            {active && <span className="absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full bg-gradient-to-b from-violet to-cyan md:block" />}
            {label}
            {href === "/notifications" && unread > 0 && <span className="rounded-full bg-cyan px-1.5 text-[10px] font-bold text-void" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
