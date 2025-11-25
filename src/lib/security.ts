/**
 * Security utilities for password validation
 * 
 * Note: Rate limiting removed - not needed for desktop Electron app (single user)
 */

// Stub for backward compatibility - always allows requests (desktop app = single user)
export async function rateLimit(
  _scope: string,
  _id: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  return { allowed: true, retryAfter: 0 };
}

// Simple password complexity: min 10 chars, at least 3 of 4 classes
export function validatePasswordComplexity(pw: string): boolean {
  if (typeof pw !== "string" || pw.length < 10) return false;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];
  const score = classes.reduce((acc, rx) => acc + (rx.test(pw) ? 1 : 0), 0);
  return score >= 3;
}

// HIBP k-anonymity breach check for passwords (no full password sent).
export async function isPasswordBreached(pw: string): Promise<boolean> {
  if (!pw) return false;
  const sha1 = await sha1Hex(pw);
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5).toUpperCase();
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    method: "GET",
    headers: { "Add-Padding": "true" },
    // Next fetch to external is fine; can be disabled in dev if needed
    cache: "no-store",
  });
  if (!res.ok) return false; // fail-closed to not block users on network errors
  const text = await res.text();
  const lines = text.split("\n");
  for (const line of lines) {
    const [suf, count] = line.trim().split(":");
    if (suf === suffix && Number(count) > 0) return true;
  }
  return false;
}

async function sha1Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hash = await crypto.subtle.digest("SHA-1", data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
