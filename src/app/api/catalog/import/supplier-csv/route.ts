import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  convertSupplierCSV, 
  validateUnifiedItem,
  generateSKU,
  mergeItems,
  UPSERT_STRATEGIES,
  type SupplierCSVRow 
} from "@/lib/catalog-harmonizer";
import { logger } from "@/lib/logger";
import { handleApiError, ValidationError } from "@/lib/error-handler";

export const dynamic = "force-dynamic";

/**
 * Import CSV Fournisseur
 * 
 * Format CSV attendu :
 * reference,name,priceHT,ean,supplier,availability
 */
export async function POST(req: Request) {
  try {
    if (!prisma) {
      throw new ValidationError('Prisma unavailable');
    }
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const supplierName = formData.get("supplierName") as string || "Inconnu";
    const margin = parseFloat(formData.get("margin") as string || "1.5");

    if (!file) {
      throw new ValidationError('Fichier CSV requis');
    }

    // Lire le CSV
    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    
    if (lines.length < 2) {
      throw new ValidationError('CSV vide ou invalide');
    }

    logger.info('IMPORT CSV: File received', { lines: lines.length, supplier: supplierName, margin });

    // Détecter le séparateur (virgule ou point-virgule)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    logger.debug('IMPORT CSV: Separator detected', { separator });

    // Parser CSV avec gestion des guillemets
    function parseCSVLine(line: string, sep: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Guillemet échappé
            current += '"';
            i++;
          } else {
            // Toggle quotes
            inQuotes = !inQuotes;
          }
        } else if (char === sep && !inQuotes) {
          // Fin de champ
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    }

    // Parser le header
    const headers = parseCSVLine(lines[0], separator);
    logger.debug('IMPORT CSV: Headers parsed', { headers });
    
    // Mapping des colonnes (français → anglais)
    const columnMapping: Record<string, string> = {
      "Code produit": "reference",
      "Désignation": "name",
      "D�signation": "name",  // Encodage cassé Windows-1252
      "Prix achat HT": "priceHT",
      "Prix Public": "priceTTC",
      "Code barre": "ean",
      "Marque": "supplier",
      "Etat stock": "availability",
      "Sous famille": "category",
      "Date nouveaut�": "dateNouveau",  // Ignoré mais mappé
      "Prix promotion": "pricePromo",    // Ignoré mais mappé
      "Conditionnement": "conditionnement", // Ignoré mais mappé
      // Fallback pour headers anglais
      "reference": "reference",
      "name": "name",
      "priceHT": "priceHT",
      "priceTTC": "priceTTC",
      "ean": "ean",
      "supplier": "supplier",
      "availability": "availability",
    };
    
    // Parser les lignes
    const rows: SupplierCSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], separator);
      const row: unknown = {};
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        const mappedHeader = columnMapping[header.trim()] || header.trim();
        
        // Convertir les nombres
        if (mappedHeader === "priceHT" || mappedHeader === "priceTTC") {
          row[mappedHeader] = parseFloat(value.replace(',', '.').replace(/\s/g, '')) || 0;
        } 
        // Convertir EAN scientifique (3,70095E+12 → 3700950000000)
        else if (mappedHeader === "ean" && value.includes('E+')) {
          try {
            // Parser notation scientifique avec précision
            const num = parseFloat(value.replace(',', '.'));
            // Utiliser toFixed pour garder précision avant conversion
            const eanStr = num.toFixed(0);
            row[mappedHeader] = eanStr;
          } catch {
            row[mappedHeader] = value;
          }
        }
        else {
          row[mappedHeader] = value;
        }
      });
      
      const typedRow = row as SupplierCSVRow;
      if (typedRow.name || typedRow.reference) {
        rows.push(typedRow);
      } else {
        logger.debug('IMPORT CSV: Line skipped (no name or reference)', { line: i, row });
      }
    }

    logger.info('IMPORT CSV: Rows parsed', { rowCount: rows.length });
    if (rows.length > 0) {
      logger.debug('IMPORT CSV: First row sample', { 
        name: rows[0].name,
        reference: rows[0].reference,
        priceHT: rows[0].priceHT,
        priceTTC: rows[0].priceTTC,
        supplier: rows[0].supplier
      });
      
      // Vérifier doublons dans le batch
      const refs = rows.map(r => r.reference);
      const uniqueRefs = new Set(refs);
      logger.debug('IMPORT CSV: Unique references check', { unique: uniqueRefs.size, total: refs.length });
      if (uniqueRefs.size < refs.length) {
        const duplicateCount = refs.length - uniqueRefs.size;
        logger.warn('IMPORT CSV: Duplicates found in CSV', { duplicateCount });
        const refCounts = new Map<string, number>();
        refs.forEach(ref => refCounts.set(ref, (refCounts.get(ref) || 0) + 1));
        const duplicates = Array.from(refCounts.entries()).filter(([_, count]) => count > 1).slice(0, 5);
        logger.debug('IMPORT CSV: Duplicate examples', { duplicates: duplicates.map(([ref, count]) => `${ref} (${count}x)`) });
      }
    }
    if (rows.length === 0) {
      logger.error('IMPORT CSV: No valid rows found', { headers, sampleLine: lines[1] });
      throw new ValidationError('Aucune ligne valide trouvée dans le CSV. Vérifiez le format.');
    }

    // Limiter à 1000 lignes par batch pour éviter timeout
    const BATCH_SIZE = 1000;
    if (rows.length > BATCH_SIZE) {
      logger.warn('IMPORT CSV: Large file, processing in batches', { totalRows: rows.length, batchSize: BATCH_SIZE });
      rows.splice(BATCH_SIZE);
    }

    // Convertir et importer
    let created = 0;
    let updated = 0;
    let errors = 0;
    let skippedDuplicates = 0; // Doublons dans le batch
    const errorDetails: string[] = [];
    const processedRefs = new Set<string>(); // Tracker refs déjà traitées dans ce batch
    
    // Batch les créations pour améliorer les performances
    const _itemsToCreate: unknown[] = [];

    for (const row of rows) {
      try {
        // Convertir en format unifié
        const unified = convertSupplierCSV(row, {
          defaultMargin: margin,
          supplierName,
        });

        // Vérifier valeur supplierSku
        if (!unified.supplierSku || unified.supplierSku === 'undefined') {
          logger.error('IMPORT CSV: Missing supplierSku', { name: unified.name, reference: row.reference });
        }

        // Vérifier doublon dans le batch actuel - UNIQUEMENT par code produit
        if (!unified.supplierSku) {
          logger.error('IMPORT CSV: No product code', { name: unified.name });
          errors++;
          continue;
        }
        
        if (processedRefs.has(unified.supplierSku)) {
          logger.debug('IMPORT CSV: Batch duplicate skipped', { name: unified.name, code: unified.supplierSku });
          skippedDuplicates++;
          continue;
        }
        processedRefs.add(unified.supplierSku);

        // Valider
        const validation = validateUnifiedItem(unified);
        if (!validation.valid) {
          const itemName = unified.name || row.name || row.reference || "Produit inconnu";
          logger.error('IMPORT CSV: Validation failed', { itemName, errors: validation.errors });
          errors++;
          errorDetails.push(`${itemName}: ${validation.errors.join(", ")}`);
          continue;
        }

        // Chercher si existe UNIQUEMENT par supplierSku (code produit P2R)
        let existing = null;
        if (unified.supplierSku) {
          existing = await prisma.catalogItem.findFirst({
            where: { 
              supplierSku: unified.supplierSku
              // PAS de vérification supplierName - code produit suffit
            }
          });
        }

        if (existing) {
          // Mettre à jour selon stratégie
          logger.debug('IMPORT CSV: DB duplicate, updating', { name: unified.name, ref: unified.supplierSku, supplier: unified.supplierName });
          const strategy = UPSERT_STRATEGIES.supplier_csv;
          const merged = mergeItems(existing, unified, strategy);

          await prisma.catalogItem.update({
            where: { id: existing.id },
            data: {
              purchasePriceHT: merged.purchasePriceHT,
              supplierSku: merged.supplierSku,
              supplierName: merged.supplierName,
              availability: merged.availability,
            }
          });
          updated++;
        } else {
          // Créer - Utiliser DIRECTEMENT supplierSku comme SKU (code produit P2R unique)
          const sku = unified.supplierSku || generateSKU(unified.category, unified.name);
          
          const _newItem = await prisma.catalogItem.create({
            data: {
              sku,
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
            }
          });
          
          created++;
        }
      } catch (e) {
        const itemName = row.name || row.reference || "Produit inconnu";
        const message = e instanceof Error ? e.message : 'Erreur inconnue';
        logger.error('IMPORT CSV: Row processing error', { itemName, error: message });
        errors++;
        errorDetails.push(`${itemName}: ${e?.message || e}`);
        
        // Arrêter si trop d'erreurs consécutives (probable problème format)
        if (errors > 50 && created === 0) {
          logger.error('IMPORT CSV: Too many errors, stopping', { errors });
          break;
        }
      }
    }
    
    logger.info('IMPORT CSV: Import completed', { created, updated, skippedDuplicates, errors });

    const message = rows.length >= BATCH_SIZE 
      ? `Import partiel (${BATCH_SIZE}/${lines.length - 1} lignes) : ${created} créés, ${updated} mis à jour, ${skippedDuplicates} doublons ignorés, ${errors} erreurs. Réimportez pour continuer.`
      : `Import terminé : ${created} créés, ${updated} mis à jour, ${skippedDuplicates} doublons ignorés, ${errors} erreurs`;

    return NextResponse.json({
      success: true,
      total: rows.length,
      totalInFile: lines.length - 1,
      created,
      updated,
      skippedDuplicates,
      errors,
      errorDetails: errorDetails.slice(0, 10), // Max 10 erreurs
      message,
      partial: rows.length >= BATCH_SIZE
    });

  } catch (error: unknown) {
    return handleApiError(error, 'POST /api/catalog/import/supplier-csv');
  }
}
