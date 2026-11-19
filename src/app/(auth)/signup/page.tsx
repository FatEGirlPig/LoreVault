import Link from "next/link";
import { signUp } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
export const metadata = { title: "Create account" };

export default function Signup() {
  return (
    <>
      <h1 className="mb-2 font-display text-xl font-bold">Create your vault</h1>
      <p className="mb-6 text-sm text-mute">Free forever. 10 GB included. Private by default.</p>
      <ActionForm action={signUp}>
        <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="input" /></label>
        <label className="block"><span className="label">Password</span><input name="password" type="password" required minLength={10} autoComplete="new-password" className="input" />
          <span className="mt-1 block text-xs text-mute">At least 10 characters.</span></label>
        <Submit className="btn-primary w-full">Create account</Submit>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-mute">Already have one? <Link href="/login" className="text-cyan">Log in</Link></p>
    </>
  );
}
