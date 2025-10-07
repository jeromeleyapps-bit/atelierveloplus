import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const prisma = await getPrisma();
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  
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
