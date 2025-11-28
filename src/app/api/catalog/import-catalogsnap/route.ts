import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getUserId } from '@/lib/api-helpers';
import { logger } from '@/lib/logger';

// Type pour les données CSV CatalogSnap (format flexible)
interface CatalogSnapRow {
  [key: string]: string;
  EAN?: string;
  ean?: string;
  code_barre?: string;
  barcode?: string;
  Nom?: string;
  nom?: string;
  name?: string;
  designation?: string;
  Quantité?: string;
  quantite?: string;
  quantity?: string;
  qty?: string;
}

/**
 * POST /api/catalog/import-catalogsnap
 * Import CSV depuis CatalogSnap (scan codes-barres EAN)
 * Ajoute/met à jour stock automatiquement
 */
export async function POST(req: NextRequest) {
  try {
    logger.info('[IMPORT-CATALOGSNAP] Début import');
    const userId = getUserId(req);
    logger.info('[IMPORT-CATALOGSNAP] userId:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Removed getPrisma() - using direct import
    if (!prisma) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    logger.info('[IMPORT-CATALOGSNAP] File:', { fileName: file?.name, fileSize: file?.size });
    
    if (!file) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
    }

    // Lire CSV
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    logger.info('[IMPORT-CATALOGSNAP] Lines:', lines.length);
    
    if (lines.length === 0) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 });
    }

    // Parser header (format CatalogSnap: EAN, Nom, Quantité)
    const header = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
    const dataLines = lines.slice(1);
    logger.info('[IMPORT-CATALOGSNAP] Header:', header);
    logger.info('[IMPORT-CATALOGSNAP] Data lines:', dataLines.length);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const line of dataLines) {
      const values = line.split(';').map(v => v.trim().replace(/"/g, ''));
      const obj: CatalogSnapRow = {};
      header.forEach((key, idx) => {
        obj[key] = values[idx] || '';
      });

      // Extraire données (flexible selon format CSV)
      const ean = obj.EAN || obj.ean || obj.code_barre || obj.barcode || '';
      const name = obj.Nom || obj.nom || obj.name || obj.designation || '';
      const quantity = parseInt(obj.Quantité || obj.quantite || obj.quantity || obj.qty || '1', 10);

      logger.info('[IMPORT-CATALOGSNAP] Processing:', { ean, name, quantity });

      if (!ean || !name) {
        logger.info('[IMPORT-CATALOGSNAP] Skipped - missing data');
        skipped++;
        continue;
      }

      // Chercher produit existant par EAN (référence)
      const existing = await prisma.catalogItem.findFirst({
        where: {
          OR: [
            { sku: ean },
            { name: name }
          ]
        }
      });

      if (existing) {
        // Mettre à jour stock (incrémenter)
        logger.info('[IMPORT-CATALOGSNAP] Updating existing:', existing.id);
        await prisma.catalogItem.update({
          where: { id: existing.id },
          data: {
            stockQty: (existing.stockQty || 0) + quantity,
            sku: ean, // Mettre à jour EAN si manquant
          }
        });
        updated++;
      } else {
        // Créer nouveau produit
        logger.info('[IMPORT-CATALOGSNAP] Creating new product:', name);
        await prisma.catalogItem.create({
          data: {
            name,
            sku: ean,
            priceHT: 0, // Prix à définir manuellement
            priceTTC: 0,
            vatRate: 0,
            category: 'PIECES',
            stockQty: quantity,
            active: true,
            minStock: 0,
            reorderQty: 0,
          }
        });
        created++;
      }
    }

    logger.info('[IMPORT-CATALOGSNAP] Success:', { created, updated, skipped });
    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      message: `Import CatalogSnap: ${created} créés, ${updated} mis à jour, ${skipped} ignorés`
    });

  } catch (error) {
    logger.error('[IMPORT-CATALOGSNAP] Erreur:', error);
    const message = error instanceof Error ? error.message : 'Erreur import';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
