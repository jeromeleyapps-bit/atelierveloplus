import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

// Exporter toutes les données
export async function GET() {
  try {
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    // Récupérer toutes les données
    const [
      users,
      customers,
      workOrders,
      invoices,
      invoiceLines,
      catalogItems,
      appSettings,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, name: true, createdAt: true } }),
      prisma.customer.findMany(),
      prisma.workOrder.findMany(),
      prisma.invoice.findMany(),
      prisma.invoiceLine.findMany(),
      prisma.catalogItem.findMany(),
      prisma.appSetting.findMany(),
    ]);

    const backup = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      data: {
        users,
        customers,
        workOrders,
        invoices,
        invoiceLines,
        catalogItems,
        appSettings,
      },
      metadata: {
        totalUsers: users.length,
        totalCustomers: customers.length,
        totalWorkOrders: workOrders.length,
        totalInvoices: invoices.length,
      }
    };

    // Créer un nom de fichier avec la date
    const filename = `atelier-velo-backup-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

// Restaurer depuis un backup
export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
    }

    const body = await req.json();
    const { data, confirmRestore } = body;

    if (!confirmRestore) {
      return NextResponse.json(
        { error: "Confirmation requise pour la restauration" },
        { status: 400 }
      );
    }

    if (!data || !data.customers || !data.workOrders) {
      return NextResponse.json(
        { error: "Format de backup invalide" },
        { status: 400 }
      );
    }

    // ATTENTION: Cette opération est destructive
    // En production, il faudrait une confirmation supplémentaire

    let restored = {
      customers: 0,
      workOrders: 0,
      invoices: 0,
      catalogItems: 0,
    };

    // Restaurer les clients (exemple)
    // Note: En production, il faut gérer les conflits d'ID
    for (const customer of data.customers) {
      try {
        await prisma.customer.upsert({
          where: { id: customer.id },
          update: customer,
          create: customer,
        });
        restored.customers++;
      } catch (error) {
        console.error(`Failed to restore customer ${customer.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      restored,
      message: "Restauration partielle effectuée. Vérifiez les logs pour les détails."
    });
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}
