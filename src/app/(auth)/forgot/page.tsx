import Link from "next/link";
import { resetPassword } from "@/app/actions";
import { ActionForm, Submit } from "@/components/forms";
export const metadata = { title: "Reset password" };

export default function Forgot() {
  return (
    <>
      <h1 className="mb-6 font-display text-xl font-bold">Reset password</h1>
      <ActionForm action={resetPassword}>
        <label className="block"><span className="label">Email</span><input name="email" type="email" required className="input" /></label>
        <Submit className="btn-primary w-full">Send reset link</Submit>
      </ActionForm>
      <p className="mt-4 text-center text-sm text-mute"><Link href="/login" className="text-cyan">Back to log in</Link></p>
    </>
  );
}
