-- AlterTable: Ajouter customerId optionnel dans Invoice pour factures directes
-- Permet de créer des factures sans WorkOrder avec un client direct
ALTER TABLE "Invoice" ADD COLUMN "customerId" TEXT;

-- Créer index pour performances
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- Note: Pas de contrainte de clé étrangère stricte pour permettre
-- suppression de clients sans bloquer les factures historiques
