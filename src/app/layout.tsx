import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import "./globals.css";
import { SoundSystem } from "@/components/sound";

const mukta = Mukta({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-mukta" });

export const metadata: Metadata = {
  title: { default: "Vaultheim — Your entire gaming universe. One place.", template: "%s · Vaultheim" },
  description: "A free gaming library and personal archive. Connect your platforms, organize every game, and preserve your gaming memories.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};
export const viewport: Viewport = { themeColor: "#010402" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={mukta.variable} style={{ ["--font-sans" as string]: "var(--font-mukta)", ["--font-display" as string]: "var(--font-mukta)" }}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var p=localStorage.getItem("vh-lite");var n=navigator;if(p==="1"||(p===null&&((n.deviceMemory&&n.deviceMemory<=4)||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)||(n.connection&&n.connection.saveData))))document.documentElement.dataset.lite=""}catch(e){}` }} />
      </head>
      <body className="font-sans antialiased">{children}<SoundSystem /></body>
    </html>
  );
}
