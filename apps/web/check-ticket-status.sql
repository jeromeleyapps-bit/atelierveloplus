-- Vérifier le statut des tickets
SELECT 
    id,
    status,
    TO_CHAR("createdAt", 'DD/MM/YYYY HH24:MI:SS') as "Créé le",
    TO_CHAR("updatedAt", 'DD/MM/YYYY HH24:MI:SS') as "Mis à jour le",
    "customerId",
    "bikeId"
FROM "WorkOrder"
ORDER BY "createdAt" DESC
LIMIT 5;
