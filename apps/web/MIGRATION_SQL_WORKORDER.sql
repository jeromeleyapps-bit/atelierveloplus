-- Migration SQL pour ajouter les relations WorkOrder
-- Exécuter directement dans PostgreSQL

-- 1. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");
CREATE INDEX IF NOT EXISTS "WorkOrder_bikeId_idx" ON "WorkOrder"("bikeId");

-- 2. Ajouter les contraintes de clé étrangère
-- Customer relation
ALTER TABLE "WorkOrder" 
DROP CONSTRAINT IF EXISTS "WorkOrder_customerId_fkey";

ALTER TABLE "WorkOrder" 
ADD CONSTRAINT "WorkOrder_customerId_fkey" 
FOREIGN KEY ("customerId") 
REFERENCES "Customer"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- CustomerBike relation
ALTER TABLE "WorkOrder" 
DROP CONSTRAINT IF EXISTS "WorkOrder_bikeId_fkey";

ALTER TABLE "WorkOrder" 
ADD CONSTRAINT "WorkOrder_bikeId_fkey" 
FOREIGN KEY ("bikeId") 
REFERENCES "CustomerBike"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Vérification
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = '"WorkOrder"'::regclass
AND contype = 'f';
