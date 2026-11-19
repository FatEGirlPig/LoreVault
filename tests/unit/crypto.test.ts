import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "@/lib/security/crypto";

const k = randomBytes(32).toString("base64");
describe("token encryption", () => {
  it("round-trips", () => expect(decrypt(encrypt("secret-token", k), k)).toBe("secret-token"));
  it("uses a fresh IV each time", () => expect(encrypt("x", k)).not.toBe(encrypt("x", k)));
  it("detects tampering", () => {
    const b = Buffer.from(encrypt("secret", k), "base64"); b[b.length - 1] ^= 1;
    expect(() => decrypt(b.toString("base64"), k)).toThrow();
  });
  it("rejects a bad key", () => expect(() => encrypt("x", "short")).toThrow());
});
