import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  // Removed getPrisma() - using direct import
  const rows = await prisma.customer.findMany({ orderBy: { updatedAt: 'desc' } });
  const headers = [
    "Prénom","Nom","Email","Téléphone",
    "Adresse","Complément adresse","Code postal","Ville","Pays",
    "Adresse de livraison","Complément adresse de livraison","Code postal de livraison","Ville de livraison","Pays de livraison",
    "Notes"
  ];
  const data = rows.map(c => [
    c.firstName ?? '', c.lastName ?? '', c.email ?? '', c.phone ?? '',
    c.address1 ?? '', c.address2 ?? '', c.zip ?? '', c.city ?? '', c.country ?? '',
    c.shipAddress1 ?? '', c.shipAddress2 ?? '', c.shipZip ?? '', c.shipCity ?? '', c.shipCountry ?? '',
    c.notes ?? ''
  ]);
  const csv = [headers, ...data].map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
  const bom = '\ufeff'; // UTF-8 BOM for Excel
  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="customers_${new Date().toISOString().slice(0,10)}.csv"`
    }
  });
}
