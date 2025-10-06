import { NextResponse } from "next/server";

// Client-side auth (RequireAuth) handles protection. Middleware is pass-through.
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  // Still exclude Next internals and API from matching for performance
  matcher: ["/((?!_next/.*|api/.*|favicon.ico).*)"],
};
