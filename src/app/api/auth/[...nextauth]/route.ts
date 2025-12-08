// NextAuth route removed. This stub intentionally exports no handlers.
// But Next.js validators expect GET/POST exports for type safety

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Stub handlers to satisfy TypeScript validators
export async function GET() {
  return NextResponse.json({ error: "Auth endpoint disabled" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Auth endpoint disabled" }, { status: 404 });
}
