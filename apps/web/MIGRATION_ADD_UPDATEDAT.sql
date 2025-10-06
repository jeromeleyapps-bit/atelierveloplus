-- Migration: Ajouter updatedAt à WorkOrder
-- Date: 2025-10-06

-- 1. Ajouter la colonne updatedAt avec valeur par défaut = createdAt
ALTER TABLE "WorkOrder" 
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Initialiser updatedAt avec createdAt pour les enregistrements existants
UPDATE "WorkOrder" 
SET "updatedAt" = "createdAt";

-- 3. Créer une fonction trigger pour mise à jour automatique
CREATE OR REPLACE FUNCTION update_workorder_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Créer le trigger
DROP TRIGGER IF EXISTS trigger_workorder_updatedat ON "WorkOrder";

CREATE TRIGGER trigger_workorder_updatedat
BEFORE UPDATE ON "WorkOrder"
FOR EACH ROW
EXECUTE FUNCTION update_workorder_updatedat();

-- Vérification
SELECT 
    id,
    status,
    TO_CHAR("createdAt", 'DD/MM/YYYY HH24:MI') as "Créé le",
    TO_CHAR("updatedAt", 'DD/MM/YYYY HH24:MI') as "Mis à jour le"
FROM "WorkOrder"
ORDER BY "createdAt" DESC
LIMIT 5;
