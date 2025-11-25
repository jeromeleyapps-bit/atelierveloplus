import { NextResponse } from "next/server";

// Proxy to SimplyBook REST API v2
// Env vars expected (you can also persist tokens in settings and load them here):
// - SIMPLYBOOK_API_KEY (optional placeholder)
// - SIMPLYBOOK_COMPANY (optional placeholder)
// If credentials are not set, we return 501 so UI can display a setup message.

const BASE = "https://user-api-v2.simplybook.it";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxy(req, resolvedParams);
}
export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxy(req, resolvedParams);
}
export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxy(req, resolvedParams);
}
export async function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxy(req, resolvedParams);
}
export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return proxy(req, resolvedParams);
}

async function proxy(req: Request, params: { path: string[] }) {
  const apiKey = process.env.SIMPLYBOOK_API_KEY || "";
  const company = process.env.SIMPLYBOOK_COMPANY || "";
  if (!apiKey || !company) {
    return NextResponse.json({ error: "simplybook_not_configured" }, { status: 501 });
  }
  const url = new URL(req.url);
  const upstream = `${BASE}/${params.path?.join("/") || ""}${url.search || ""}`;

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
    "X-Company-Login": company,
    "X-Token": apiKey,
  };

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  };

  const res = await fetch(upstream, init);
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") || "application/json" } });
}
