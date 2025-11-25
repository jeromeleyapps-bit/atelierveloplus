import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { Readable } from "stream";
import readline from "readline";
import { 
  convertSupplierCSV, 
  validateUnifiedItem,
} from "@/lib/catalog-harmonizer";
import { logger } from "@/lib/logger";
import { handleApiError, ValidationError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

interface CSVRow {
  [key: string]: string | number;
  name?: string;
  reference?: string;
  priceHT?: number;
  priceTTC?: number;
}

/**
 * Import CSV Streaming - Optimisé pour gros fichiers
 * Utilise Node.js Streams + Bulk Insert
 */
export async function POST(req: Request) {
  try {
    if (!prisma) {
      throw new ValidationError('Prisma unavailable');
    }

    logger.info('IMPORT STREAM: Starting streaming import');
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const supplierName = formData.get("supplierName") as string || "Inconnu";
    const margin = parseFloat(formData.get("margin") as string || "1.5");

    logger.info('IMPORT STREAM: File received', { name: file?.name, size: file?.size, supplier: supplierName, margin });

    if (!file) {
      throw new ValidationError('Fichier CSV requis');
    }

    // Convertir File en Stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);
    
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let headers: string[] = [];
    const rows: CSVRow[] = [];
    const BATCH_SIZE = 500; // Batch plus petit pour bulk insert
    
    let created = 0;
    let updated = 0;
    let errors = 0;
    const processedRefs = new Set<string>();

    // Parser ligne par ligne (streaming)
    for await (const line of rl) {
      lineNumber++;
      
      if (!line.trim()) continue;
      
      // Header
      if (lineNumber === 1) {
        const separator = line.includes(';') ? ';' : ',';
        headers = line.split(separator).map(h => h.trim());
        logger.debug('IMPORT STREAM: Headers parsed', { headers: headers.slice(0, 5) });
        continue;
      }
      
      // Parser ligne
      const separator = line.includes(';') ? ';' : ',';
      const values = line.split(separator);
      const row: CSVRow = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        const mappedHeader = mapHeader(header);
        
        if (mappedHeader === "priceHT" || mappedHeader === "priceTTC") {
          row[mappedHeader] = parseFloat(value.replace(',', '.').replace(/\s/g, '')) || 0;
        } else {
          row[mappedHeader] = value.trim();
        }
      });
      
      if (row.name || row.reference) {
        rows.push(row);
      }
      
      // Traiter par batch
      if (rows.length >= BATCH_SIZE) {
        const result = await processBatch(rows, supplierName, margin, prisma, processedRefs);
        created += result.created;
        updated += result.updated;
        errors += result.errors;
        
        rows.length = 0; // Vider array
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        
        logger.debug('IMPORT STREAM: Batch processed', { line: lineNumber, created, updated });
      }
    }
    
    // Dernier batch
    if (rows.length > 0) {
      const result = await processBatch(rows, supplierName, margin, prisma, processedRefs);
      created += result.created;
      updated += result.updated;
      errors += result.errors;
    }

    logger.info('IMPORT STREAM: Import completed', { created, updated, errors });

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      message: `Import streaming terminé: ${created} créés, ${updated} mis à jour, ${errors} erreurs`
    });

  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/catalog/import/supplier-csv-stream');
  }
}

// Traiter un batch avec bulk insert
async function processBatch(
  rows: CSVRow[], 
  supplierName: string, 
  margin: number, 
  prisma: typeof import('@/lib/prisma').prisma,
  processedRefs: Set<string>
) {
  let created = 0;
  let updated = 0;
  let errors = 0;
  
  const itemsToCreate: Prisma.CatalogItemCreateManyInput[] = [];
  const itemsToUpdate: Array<{ where: { id: string }; data: Prisma.CatalogItemUpdateInput }> = [];
  
  for (const row of rows) {
    try {
      const unified = convertSupplierCSV(row as unknown as { reference: string; name: string; [key: string]: string | number | undefined }, { defaultMargin: margin, supplierName });
      
      // Skip doublons dans batch
      if (!unified.supplierSku || processedRefs.has(unified.supplierSku)) {
        continue;
      }
      processedRefs.add(unified.supplierSku);
      
      // Valider
      const validation = validateUnifiedItem(unified);
      if (!validation.valid) {
        errors++;
        continue;
      }
      
      // Vérifier si existe
      const existing = await prisma.catalogItem.findFirst({
        where: { supplierSku: unified.supplierSku }
      });
      
      if (existing) {
        itemsToUpdate.push({
          where: { id: existing.id },
          data: {
            purchasePriceHT: unified.purchasePriceHT,
            priceHT: unified.priceHT,
            priceTTC: unified.priceTTC,
            availability: unified.availability,
          }
        });
      } else {
        itemsToCreate.push({
          sku: unified.supplierSku || `P2R-${Date.now()}-${Math.random()}`,
          ean: unified.ean,
          supplierSku: unified.supplierSku,
          name: unified.name,
          category: unified.category,
          priceHT: unified.priceHT,
          priceTTC: unified.priceTTC,
          vatRate: unified.vatRate,
          purchasePriceHT: unified.purchasePriceHT,
          stockQty: unified.stockQty,
          minStock: unified.minStock,
          supplierName: unified.supplierName,
          active: unified.active,
        });
      }
    } catch (_e) {
      errors++;
    }
  }
  
  // Bulk insert (beaucoup plus rapide!)
  if (itemsToCreate.length > 0) {
    try {
      await prisma.catalogItem.createMany({
        data: itemsToCreate
        // skipDuplicates non supporté par SQLite
      });
      created = itemsToCreate.length;
    } catch (_e) {
      // Si erreur unique constraint, créer un par un
      logger.warn('IMPORT STREAM: Bulk insert failed, creating individually');
      for (const item of itemsToCreate) {
        try {
          await prisma.catalogItem.create({ data: item });
          created++;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            logger.debug('IMPORT STREAM: Duplicate SKU skipped', { sku: item.sku });
          } else {
            errors++;
          }
        }
      }
    }
  }
  
  // Bulk update
  if (itemsToUpdate.length > 0) {
    for (const item of itemsToUpdate) {
      await prisma.catalogItem.update(item);
    }
    updated = itemsToUpdate.length;
  }
  
  return { created, updated, errors };
}

// Mapper headers
function mapHeader(header: string): string {
  const mapping: Record<string, string> = {
    "Code produit": "reference",
    "Désignation": "name",
    "D�signation": "name",
    "Prix achat HT": "priceHT",
    "Prix Public": "priceTTC",
    "Code barre": "ean",
    "Marque": "supplier",
    "Etat stock": "availability",
    "Sous famille": "category",
  };
  return mapping[header.trim()] || header.trim();
}
