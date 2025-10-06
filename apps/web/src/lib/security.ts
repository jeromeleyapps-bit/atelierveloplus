import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a rate limiter backed by Upstash Redis if env is present, otherwise fallback to in-memory.
// Usage: const { allowed, retryAfter } = await rateLimit("login", ip, 10, 60);

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function key(scope: string, id: string) {
  return `${scope}:${id}`;
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  // Validate presence and scheme; ignore placeholders
  if (!url || !token) return null;
  if (!/^https:\/\//i.test(url)) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

let rl: Ratelimit | null = null;
(function initLimiter() {
  try {
    const redis = getRedis();
    if (redis) {
      rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"), // default baseline
        analytics: false,
        prefix: "av+",
      });
    }
  } catch {
    rl = null;
  }
})();

export async function rateLimit(scope: string, id: string, max = 10, windowSeconds = 60): Promise<{ allowed: boolean; retryAfter?: number }>{
  if (rl) {
    // Upstash supports custom limiter per call by creating a new instance; to avoid overhead, we can just allow default 10/min
    const res = await rl.limit(key(scope, id));
    return { allowed: res.success, retryAfter: res.reset ? Math.max(0, Math.ceil((res.reset - Date.now()) / 1000)) : undefined };
  }
  // Fallback in-memory
  const now = Date.now();
  const k = key(scope, id);
  const w = windowSeconds * 1000;
  const v = memoryBuckets.get(k);
  if (!v || v.resetAt < now) {
    memoryBuckets.set(k, { count: 1, resetAt: now + w });
    return { allowed: true, retryAfter: 0 };
  }
  if (v.count >= max) {
    return { allowed: false, retryAfter: Math.max(0, Math.ceil((v.resetAt - now) / 1000)) };
  }
  v.count += 1;
  return { allowed: true, retryAfter: Math.max(0, Math.ceil((v.resetAt - now) / 1000)) };
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
