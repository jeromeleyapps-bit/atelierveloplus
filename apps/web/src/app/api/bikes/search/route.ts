import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bikes/search?q=nom+client
 * Recherche rapide de clients et leurs vélos
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        customers: [],
        message: "Entrez au moins 2 caractères",
      });
    }

    const searchTerm = query.trim().toLowerCase();

    // Rechercher les clients par nom, prénom, email ou téléphone
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm } },
          { lastName: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
        ],
      },
      include: {
        bikes: {
          include: {
            _count: {
              select: {
                workOrders: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      take: 10,
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Enrichir avec les dernières interventions
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const bikesWithLastIntervention = await Promise.all(
          customer.bikes.map(async (bike) => {
            const lastWorkOrder = await prisma.workOrder.findFirst({
              where: { bikeId: bike.id },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                createdAt: true,
                status: true,
                type: true,
              },
            });

            return {
              id: bike.id,
              brand: bike.brand,
              model: bike.model,
              serialNumber: bike.serialNumber,
              color: bike.color,
              wheelSize: bike.wheelSize,
              tireSize: bike.tireSize,
              frameMaterial: bike.frameMaterial,
              frameSize: bike.frameSize,
              brakeType: bike.brakeType,
              gearSystem: bike.gearSystem,
              notes: bike.notes,
              interventionsCount: bike._count.workOrders,
              lastIntervention: lastWorkOrder,
            };
          }),
        );

        return {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          bikes: bikesWithLastIntervention,
        };
      }),
    );

    return NextResponse.json({
      customers: enrichedCustomers,
      count: enrichedCustomers.length,
    });
  } catch (error) {
    console.error("[API] Error searching bikes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 },
    );
  }
}
