import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/jwt";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * PATCH /api/user/profile
 * Met à jour User.name (firstName + lastName combinés)
 */
export async function PATCH(req: Request) {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });

  // Get user from JWT
  const jwtUser = await getUserFromToken(req);
  if (!jwtUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : null;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: jwtUser.userId },
      data: { name },
      select: { id: true, email: true, name: true, role: true },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    logger.error("[API] Error updating user profile:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}
