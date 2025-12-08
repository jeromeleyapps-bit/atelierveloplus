import { NextRequest, NextResponse } from 'next/server';

import { prisma } from "@/lib/prisma";
import { getUserId } from '@/lib/api-helpers';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

// Type pour un produit CSV générique (peut avoir différentes colonnes selon le fournisseur)
interface CSVProduct {
  [key: string]: string;
  reference?: string;
  name?: string;
  nom?: string;
  designation?: string;
  prix_ht?: string;
  price?: string;
  priceHT?: string;
  stock?: string;
  quantity?: string;
  category?: string;
  categorie?: string;
  supplier?: string;
  fournisseur?: string;
  available?: string;
  lastImport?: string;
}

/**
 * POST /api/catalog/import-csv-streaming
 * Import CSV fournisseur par streaming (17k+ produits)
 * 
 * Stratégie:
 * 1. Lecture par chunks (1000 lignes)
 * 2. Mise à jour différentielle (nouveaux + modifiés uniquement)
 * 3. Progress streaming
 */
export async function POST(req: NextRequest) {
  // Charger Prisma AVANT le stream pour qu'il soit accessible dans le controller
  // Removed getPrisma() - using direct import
  if (!prisma) {
    return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  }
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const userId = getUserId(req);
        if (!userId) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Non authentifié' }) + '\n'));
          controller.close();
          return;
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Fichier requis' }) + '\n'));
          controller.close();
          return;
        }

        // Lire fichier
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        
        if (lines.length === 0) {
          controller.enqueue(encoder.encode(JSON.stringify({ error: 'Fichier vide' }) + '\n'));
          controller.close();
          return;
        }

        // Parser header
        const header = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
        const dataLines = lines.slice(1);
        
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'start',
          total: dataLines.length,
          message: `Début import: ${dataLines.length} lignes`
        }) + '\n'));

        // Traitement par chunks de 1000
        const CHUNK_SIZE = 1000;
        let processed = 0;
        let created = 0;
        let updated = 0;
        let skipped = 0;

        for (let i = 0; i < dataLines.length; i += CHUNK_SIZE) {
          const chunk = dataLines.slice(i, i + CHUNK_SIZE);
          
          // Parser chunk
          const products = chunk.map(line => {
            const values = line.split(';').map(v => v.trim().replace(/"/g, ''));
            const obj: CSVProduct = {};
            header.forEach((key, idx) => {
              obj[key] = values[idx] || '';
            });
            return obj;
          }).filter((p): p is CSVProduct => Boolean(p.reference && p.name)); // Filtrer lignes invalides

          if (products.length === 0) {
            skipped += chunk.length;
            continue;
          }

          // Extraire références pour query
          const refs = products.map(p => p.reference);

          // Query produits existants
          const existing = await prisma.supplierProduct.findMany({
            where: {
              userId,
              reference: { in: refs }
            },
            select: {
              reference: true,
              priceHT: true,
              stock: true,
            }
          });

          const existingMap = new Map(existing.map(e => [e.reference, e]));

          // Séparer nouveaux / modifiés
          const toCreate: Prisma.SupplierProductCreateManyInput[] = [];
          const toUpdate: Array<{ reference: string; priceHT: number; stock: number; available: boolean; lastImport: Date }> = [];

          for (const product of products) {
            const ex = existingMap.get(product.reference!);
            const priceHT = parseFloat(product.prix_ht || product.price || product.priceHT || '0');
            const stock = parseInt(product.stock || product.quantity || '0', 10);

            if (!ex) {
              // Nouveau produit
              toCreate.push({
                userId,
                reference: product.reference!,
                name: product.name || product.nom || product.designation || 'Produit',
                category: product.category || product.categorie || null,
                priceHT,
                stock,
                available: stock > 0,
                supplierName: product.supplier || product.fournisseur || 'Fournisseur',
                lastImport: new Date(),
              });
            } else if (ex.priceHT !== priceHT || ex.stock !== stock) {
              // Produit modifié
              toUpdate.push({
                reference: product.reference!,
                priceHT,
                stock,
                available: stock > 0,
                lastImport: new Date(),
              });
            } else {
              // Pas de changement
              skipped++;
            }
          }

          // Batch create
          if (toCreate.length > 0) {
            await prisma.supplierProduct.createMany({
              data: toCreate,
            });
            created += toCreate.length;
          }

          // Batch update
          if (toUpdate.length > 0) {
            for (const upd of toUpdate) {
              await prisma.supplierProduct.updateMany({
                where: {
                  userId,
                  reference: upd.reference,
                },
                data: {
                  priceHT: upd.priceHT,
                  stock: upd.stock,
                  available: upd.available,
                  lastImport: upd.lastImport,
                },
              });
            }
            updated += toUpdate.length;
          }

          processed += chunk.length;

          // Progress
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'progress',
            processed,
            total: dataLines.length,
            created,
            updated,
            skipped,
            percent: Math.round((processed / dataLines.length) * 100)
          }) + '\n'));
        }

        // Fin
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'complete',
          processed,
          created,
          updated,
          skipped,
          message: `Import terminé: ${created} créés, ${updated} mis à jour, ${skipped} ignorés`
        }) + '\n'));

        controller.close();

      } catch (error) {
        logger.error('[IMPORT-CSV-STREAMING] Erreur:', error);
        const message = error instanceof Error ? error.message : 'Erreur import';
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'error',
          error: message
        }) + '\n'));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
