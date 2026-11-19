import Link from "next/link";
import { signIn } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Notice } from "@/components/ui";
export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="mb-6 font-display text-xl font-bold">Welcome back</h1>
      <Notice params={sp} />
      <ActionForm action={signIn}>
        <input type="hidden" name="next" value={sp.next ?? ""} />
        <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
        <label className="block"><span className="label">Password</span><input name="password" type="password" required autoComplete="current-password" className="input" /></label>
        <Submit className="btn-primary w-full">Log in</Submit>
      </ActionForm>
      <div className="mt-4 flex justify-between text-sm text-mute">
        <Link href="/forgot" className="hover:text-ink">Forgot password?</Link>
        <Link href="/signup" className="hover:text-ink">Create account</Link>
      </div>
    </>
  );
}
