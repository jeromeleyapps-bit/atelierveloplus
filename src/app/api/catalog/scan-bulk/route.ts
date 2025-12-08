import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { convertScannedItem, validateUnifiedItem, generateSKU } from "@/lib/catalog-harmonizer";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * Import CSV Scanner (Bulk)
 * 
 * Format CSV attendu :
 * ean,quantity
 * 3700123456789,5
 * 3700123456790,10
 */
export async function POST(req: Request) {
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 501 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "no_file" }, { status: 400 });
    }

    // Lire le CSV
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: "empty_csv" }, { status: 400 });
    }

    logger.info(`[IMPORT SCANNER] ${lines.length} lignes dans le fichier`);

    // Parser CSV simple (ean,quantity)
    function parseCSVLine(line: string): string[] {
      return line.split(",").map(v => v.trim());
    }

    // Parser le header
    const headers = parseCSVLine(lines[0]);
    logger.info(`[IMPORT SCANNER] Headers`, { headers });
    
    // Parser les lignes
    const scans: { ean: string; quantity: number }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const ean = values[0];
      const quantity = parseInt(values[1]) || 1;
      
      if (ean && /^\d{8,13}$/.test(ean)) {
        scans.push({ ean, quantity });
      }
    }

    logger.info(`[IMPORT SCANNER] ${scans.length} scans à traiter`);

    // Traiter les scans
    let created = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const scan of scans) {
      try {
        logger.info(`[IMPORT SCANNER] Traitement EAN: ${scan.ean} (qty: ${scan.quantity})`);
        
        // Chercher si existe
        const existing = await prisma.catalogItem.findFirst({
          where: { ean: scan.ean }
        });

        if (existing) {
          // Incrémenter le stock
          await prisma.catalogItem.update({
            where: { id: existing.id },
            data: {
              stockQty: { increment: scan.quantity }
            }
          });
          logger.info(`[IMPORT SCANNER] ✅ Stock mis à jour: ${existing.name} (+${scan.quantity})`);
          updated++;
        } else {
          // Créer nouvel item
          const unified = convertScannedItem({
            ean: scan.ean,
            quantity: scan.quantity,
            timestamp: new Date()
          });

          const validation = validateUnifiedItem(unified);
          if (!validation.valid) {
            logger.error(`[IMPORT SCANNER] Validation échouée pour ${scan.ean}`, { errors: validation.errors });
            errors++;
            errorDetails.push(`${scan.ean}: ${validation.errors.join(", ")}`);
            continue;
          }

          const sku = generateSKU(unified.category, unified.name);
          
          await prisma.catalogItem.create({
            data: {
              sku,
              ean: unified.ean,
              name: unified.name,
              category: unified.category,
              priceHT: unified.priceHT,
              priceTTC: unified.priceTTC,
              vatRate: unified.vatRate,
              stockQty: unified.stockQty,
              minStock: unified.minStock,
              active: unified.active,
            }
          });
          
          logger.info(`[IMPORT SCANNER] ✅ Créé: ${unified.name} (${sku})`);
          created++;
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erreur inconnue';
        logger.error(`[IMPORT SCANNER] Erreur EAN ${scan.ean}`, { error: message });
        errors++;
        errorDetails.push(`${scan.ean}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: scans.length,
      created,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10),
      message: `Import scanner terminé : ${updated} mis à jour, ${created} créés, ${errors} erreurs`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'import';
    logger.error("[IMPORT SCANNER] Erreur", { error: message });
    return NextResponse.json({
      error: "import_failed",
      message
    }, { status: 500 });
  }
}
