"use client";
import { usePathname } from "next/navigation";
/** Sends you back to the page you were on (login or sign-up) after logging out. */
export function SwitchTarget() {
  return <input type="hidden" name="next" value={usePathname()} />;
}
