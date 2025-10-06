-- Migration SQL pour ajouter le support des devis
-- Exécuter dans Supabase SQL Editor

-- Ajouter les nouveaux champs à la table Invoice
ALTER TABLE "Invoice" 
ADD COLUMN IF NOT EXISTS "validUntil" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "convertedToId" TEXT;

-- Mettre à jour le commentaire sur le champ type
COMMENT ON COLUMN "Invoice"."type" IS 'invoice | quote | credit';

-- Créer un index sur convertedToId pour les recherches
CREATE INDEX IF NOT EXISTS "Invoice_convertedToId_idx" ON "Invoice"("convertedToId");

-- Créer un index sur type pour filtrer par type de document
CREATE INDEX IF NOT EXISTS "Invoice_type_idx" ON "Invoice"("type");

-- Créer un index sur validUntil pour les devis expirés
CREATE INDEX IF NOT EXISTS "Invoice_validUntil_idx" ON "Invoice"("validUntil");

-- Afficher le résultat
SELECT 'Migration completed successfully!' as message;
