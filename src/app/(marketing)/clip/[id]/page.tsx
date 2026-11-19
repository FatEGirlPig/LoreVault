import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/supabase/server";
import { getClip } from "@/lib/clips";
import { ClipCard } from "@/components/clip-card";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await getUser();
  const clip = await getClip(supabase, id);
  return { title: clip ? clip.title || "Gaming clip" : "Clip not found" };
}

// Shareable clip page. RLS hides private clips, and friends-only clips from non-friends.
export default async function ClipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getUser();
  const clip = await getClip(supabase, id);
  if (!clip) notFound();
  return <div className="mx-auto max-w-4xl px-4 py-12"><ClipCard clip={clip} /></div>;
}
