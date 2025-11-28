import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

/**
 * Import CSV pour le catalogue
 * Format attendu : sku,name,category,priceHT,priceTTC,stockQty,minStock,barcode
 * Exemple : "PNEU-001","Pneu VTT 26","PIECES",15.00,18.00,10,5,"3700123456789"
 * 
 * Notes :
 * - Le taux de TVA (vatRate) est calculé automatiquement depuis priceHT et priceTTC
 * - Si priceTTC est absent, une TVA de 20% est appliquée par défaut
 * - Catégories valides : PIECES, EQUIPEMENTS, AUTRES (insensible à la casse)
 * - Si la catégorie est invalide, "AUTRES" est utilisé par défaut
 */
export async function POST(req: Request) {
  // Removed getPrisma() - using direct import

  try {
    const text = await req.text();
    
    // Supprimer BOM UTF-8 si présent
    const cleanText = text.replace(/^\ufeff/, '');
    const lines = cleanText.split(/\r?\n/).filter(l => l.trim());
    
    if (lines.length === 0) {
      return NextResponse.json({ error: "empty_file" }, { status: 400 });
    }

    // Parser CSV simple (gère les guillemets)
    function parseCSVLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    }

    // Vérifier si la première ligne est un header
    const firstLine = parseCSVLine(lines[0]);
    const hasHeader = firstLine[0]?.toLowerCase().includes('sku') || 
                      firstLine[0]?.toLowerCase().includes('code') ||
                      firstLine[1]?.toLowerCase().includes('nom') ||
                      firstLine[1]?.toLowerCase().includes('designation');

    const dataLines = hasHeader ? lines.slice(1) : lines;
    
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const cols = parseCSVLine(line);
      
      // Format attendu : sku, name, category, priceHT, priceTTC, stockQty, minStock, barcode
      const [sku, name, category, priceHTStr, priceTTCStr, stockQtyStr, minStockStr, barcode] = cols;
      
      if (!name || !name.trim()) {
        errors.push(`Ligne ignorée (nom manquant): ${line.substring(0, 50)}`);
        continue;
      }

      try {
        const priceHT = parseFloat(priceHTStr) || 0;
        const priceTTC = parseFloat(priceTTCStr) || priceHT * 1.2;
        const stockQty = parseInt(stockQtyStr) || 0;
        const minStock = parseInt(minStockStr) || 0;
        
        // Calculer le taux de TVA depuis les prix
        const vatRate = priceHT > 0 ? ((priceTTC - priceHT) / priceHT) : 0.2;

        // Valider et normaliser la catégorie
        const validCategories = ['PIECES', 'EQUIPEMENTS', 'AUTRES'];
        const categoryRaw = category?.trim().toUpperCase() || '';
        const categoryValid = validCategories.includes(categoryRaw) ? categoryRaw : 'AUTRES';

        // Chercher si le produit existe déjà (par SKU ou barcode)
        let existing = null;
        if (sku && sku.trim()) {
          existing = await prisma.catalogItem.findFirst({
            where: { sku: sku.trim() }
          });
        }
        if (!existing && barcode && barcode.trim()) {
          existing = await prisma.catalogItem.findFirst({
            where: { ean: barcode.trim() }
          });
        }

        const data = {
          sku: sku?.trim() || undefined,
          name: name.trim(),
          category: categoryValid,
          priceHT,
          priceTTC,
          vatRate,
          stockQty,
          minStock,
          barcode: barcode?.trim() || undefined,
        };

        if (existing) {
          // Mettre à jour
          await prisma.catalogItem.update({
            where: { id: existing.id },
            data: {
              ...data,
              stockQty: existing.stockQty + stockQty, // Ajouter au stock existant
            }
          });
          updated++;
        } else {
          // Créer
          await prisma.catalogItem.create({
            data
          });
          imported++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Erreur ligne "${name}": ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      updated,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'import';
    logger.error('[API] Catalog import error', { error: message });
    return NextResponse.json({
      error: "import_failed",
      message: error?.message || String(error)
    }, { status: 500 });
  }
}
