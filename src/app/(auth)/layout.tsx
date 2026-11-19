import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { getUser } from "@/lib/supabase/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser();
  if (user) redirect("/dashboard");
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <div className="card w-full max-w-sm">{children}</div>
    </main>
  );
}
