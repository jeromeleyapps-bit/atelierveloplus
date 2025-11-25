import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/service-rates/import
 * Importe des prestations depuis un CSV
 * 
 * Format CSV attendu:
 * prestation,tarif,type_velo,categorie,duree,description
 */
export async function POST(request: NextRequest) {
  // Removed getPrisma() - using direct import
  if (!prisma) return NextResponse.json({ error: "prisma_unavailable" }, { status: 503 });
  
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 },
      );
    }

    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Fichier CSV vide" },
        { status: 400 },
      );
    }

    // Ignorer la première ligne (en-têtes)
    const dataLines = lines.slice(1);

    const imported: unknown[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      try {
        // Parser la ligne CSV (gestion des guillemets)
        const values = parseCSVLine(line);

        if (values.length < 2) {
          errors.push(`Ligne ${i + 2}: Format invalide`);
          continue;
        }

        const [name, priceStr, bikeType, category, durationStr, description] = values;

        const priceHT = parseFloat(priceStr.replace(",", "."));
        if (isNaN(priceHT)) {
          errors.push(`Ligne ${i + 2}: Tarif invalide (${priceStr})`);
          continue;
        }

        const duration = durationStr ? parseInt(durationStr) : null;

        // Créer ou mettre à jour la prestation
        const serviceRate = await prisma.serviceRate.upsert({
          where: {
            // Utiliser un identifiant unique basé sur nom + type vélo
            id: `temp-${name}-${bikeType || "all"}`,
          },
          update: {
            priceHT,
            bikeType: bikeType || null,
            category: category || null,
            duration,
            description: description || null,
          },
          create: {
            name,
            priceHT,
            bikeType: bikeType || null,
            category: category || null,
            duration,
            description: description || null,
            active: true,
          },
        }).catch(async () => {
          // Si l'upsert échoue (id n'existe pas), créer directement
          return await prisma.serviceRate.create({
            data: {
              name,
              priceHT,
              bikeType: bikeType || null,
              category: category || null,
              duration,
              description: description || null,
              active: true,
            },
          });
        });

        imported.push(serviceRate);
      } catch (error) {
        logger.error(`Error importing line ${i + 2}:`, error);
        errors.push(`Ligne ${i + 2}: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error("[API] Error importing service rates:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import" },
      { status: 500 },
    );
  }
}

/**
 * Parse une ligne CSV en gérant les guillemets
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
