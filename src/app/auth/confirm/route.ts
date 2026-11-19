import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Email links (sign-up confirmation, password reset) use a token hash, so they work in any browser or device. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token_hash = sp.get("token_hash"), type = sp.get("type") as EmailOtpType | null;
  const next = sp.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (token_hash && type) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" }); // the link's account replaces whoever was signed in here
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/settings?message=Choose+a+new+password+below#password" : `${safeNext}${safeNext.includes("?") ? "&" : "?"}welcome=1`, req.url));
  }
  return NextResponse.redirect(new URL("/login?error=That+link+is+invalid+or+has+expired.+Request+a+new+one.", req.url));
}
