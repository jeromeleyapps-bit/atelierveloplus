-- Vérification "Terminés ce mois"
-- Note: updatedAt n'existe PAS dans WorkOrder, on utilise createdAt

-- 1. Tous les tickets ready
SELECT 
    id,
    status,
    "createdAt"
FROM "WorkOrder"
WHERE status = 'ready'
ORDER BY "createdAt" DESC;

-- 2. Tickets ready créés ce mois (par createdAt)
SELECT 
    COUNT(*) as "Terminés ce mois (createdAt)"
FROM "WorkOrder"
WHERE status = 'ready'
AND "createdAt" >= DATE_TRUNC('month', CURRENT_DATE)
AND "createdAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

-- 3. Détail des tickets ready avec dates
SELECT 
    id,
    status,
    TO_CHAR("createdAt", 'DD/MM/YYYY HH24:MI') as "Date création",
    CASE 
        WHEN "createdAt" >= DATE_TRUNC('month', CURRENT_DATE) THEN 'OUI'
        ELSE 'NON'
    END as "Créé ce mois ?"
FROM "WorkOrder"
WHERE status = 'ready'
ORDER BY "createdAt" DESC
LIMIT 10;
