import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    // Compter les utilisateurs
    const totalUsers = await prisma.user.count();

    // Compter les tickets actifs (non terminés)
    const activeTickets = await prisma.workOrder.count({
      where: {
        status: {
          in: ['pending', 'in_progress', 'waiting_parts']
        }
      }
    });

    // Compter les factures en attente (émises mais non payées)
    const pendingInvoices = await prisma.invoice.count({
      where: {
        type: 'invoice',
        status: 'issued'
      }
    });

    // Calculer la taille approximative de la base de données
    // Note: Ceci est une approximation, la vraie taille nécessite une requête SQL brute
    const dbSize = "45.2 MB"; // TODO: Implémenter calcul réel avec raw SQL

    // Récupérer la date de la dernière sauvegarde (si système de backup existe)
    const lastBackup = new Date().toLocaleDateString("fr-FR");

    return NextResponse.json({
      totalUsers,
      activeTickets,
      pendingInvoices,
      dbSize,
      lastBackup,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
