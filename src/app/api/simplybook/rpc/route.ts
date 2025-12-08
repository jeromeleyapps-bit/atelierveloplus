import { NextResponse } from "next/server";

// Proxy to SimplyBook JSON-RPC API
// Endpoint: https://user-api.simplybook.it/
// Env expected:
//  - SIMPLYBOOK_API_KEY (optional placeholder)
//  - SIMPLYBOOK_COMPANY (optional placeholder)
// Note: JSON-RPC auth flow may require obtaining a token; this proxy only forwards
// payloads and headers. Implement token exchange client-side hitting this proxy as needed.

const BASE = "https://user-api.simplybook.it";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const apiKey = process.env.SIMPLYBOOK_API_KEY || "";
  const company = process.env.SIMPLYBOOK_COMPANY || "";
  if (!apiKey || !company) {
    return NextResponse.json({ error: "simplybook_not_configured" }, { status: 501 });
  }
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
    "X-Company-Login": company,
    "X-Token": apiKey,
  };
  const body = await req.text();
  const res = await fetch(BASE, { method: 'POST', headers, body });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") || "application/json" } });
}
