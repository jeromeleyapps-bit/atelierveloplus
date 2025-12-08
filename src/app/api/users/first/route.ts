import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Removed getPrisma() - using direct import
  
  const user = await prisma.user.findFirst({
    select: {
      id: true,
      email: true,
      name: true,
    }
  });
  
  if (!user) {
    return NextResponse.json({ error: "no_user_found" }, { status: 404 });
  }
  
  return NextResponse.json(user, { status: 200 });
}
