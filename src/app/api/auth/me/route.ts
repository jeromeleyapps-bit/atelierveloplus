import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Valide le jeton de session et renvoie l'utilisateur correspondant.
 *
 * Sert à vérifier au démarrage qu'un `jwt_token` conservé dans le navigateur est
 * toujours valide. Un jeton signé avec un ancien JWT_SECRET (rotation des secrets,
 * réinstallation par-dessus d'anciennes données) doit être purgé plutôt que traîné :
 * il laissait sinon l'application en session fantôme, et faisait échouer le wizard
 * de première configuration dès sa première requête.
 *
 * Volontairement strict : aucun repli sur l'identité Electron locale, puisque le but
 * est précisément de juger la validité du jeton lui-même.
 */
export async function GET(req: Request) {
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  }

  const jwtUser = await getUserFromToken(req);
  if (!jwtUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: jwtUser.userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  // Jeton bien signé mais dont l'utilisateur n'existe plus (base recréée) :
  // il n'est pas plus utilisable qu'un jeton invalide.
  if (!user || !user.active) {
    return NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }

  return NextResponse.json({ user }, { status: 200 });
}
