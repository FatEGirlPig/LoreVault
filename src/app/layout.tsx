import type { Metadata, Viewport } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import { SoundSystem } from "@/components/sound";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: { default: "LoreVault — Your entire gaming universe. One place.", template: "%s · LoreVault" },
  description: "A free gaming library and personal archive. Connect your platforms, organize every game, and preserve your gaming memories.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};
export const viewport: Viewport = { themeColor: "#05060d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable}`} style={{ ["--font-sans" as string]: "var(--font-inter)", ["--font-display" as string]: "var(--font-orbitron)" }}>
      <body className="font-sans antialiased">{children}<SoundSystem /></body>
    </html>
  );
}
