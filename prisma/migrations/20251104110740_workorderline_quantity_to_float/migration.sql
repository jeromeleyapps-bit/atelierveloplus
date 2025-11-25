-- AlterTable WorkOrderLine: Change quantity from INTEGER to REAL (Float)
-- SQLite ne supporte pas ALTER COLUMN TYPE directement, donc on recrée la table

-- 1. Créer nouvelle table avec quantity en REAL
CREATE TABLE "WorkOrderLine_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workOrderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "priceHT" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "duration" INTEGER,
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkOrderLine_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Copier les données (quantity converti de INTEGER vers REAL)
INSERT INTO "WorkOrderLine_new" 
SELECT 
    "id",
    "workOrderId",
    "type",
    "description",
    CAST("quantity" AS REAL) as "quantity",
    "priceHT",
    "vatRate",
    "duration",
    "sourceId",
    "notes",
    "createdAt",
    "updatedAt"
FROM "WorkOrderLine";

-- 3. Supprimer ancienne table
DROP TABLE "WorkOrderLine";

-- 4. Renommer nouvelle table
ALTER TABLE "WorkOrderLine_new" RENAME TO "WorkOrderLine";

-- 5. Recréer les index (IF NOT EXISTS pour éviter erreurs si migration déjà appliquée)
CREATE INDEX IF NOT EXISTS "WorkOrderLine_workOrderId_idx" ON "WorkOrderLine"("workOrderId");
CREATE INDEX IF NOT EXISTS "WorkOrderLine_type_idx" ON "WorkOrderLine"("type");
