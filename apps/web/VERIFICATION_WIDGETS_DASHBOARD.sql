-- Vérification Widgets Dashboard
-- Comparer avec les chiffres affichés sur /dashboard

-- ============================================
-- Widget 1: Réparations en Attente
-- ============================================
SELECT 
    'Réparations en attente' as "Widget",
    COUNT(*) as "Nombre"
FROM "WorkOrder"
WHERE status = 'created';

-- ============================================
-- Widget 2: Terminés ce Mois
-- ============================================
SELECT 
    'Terminés ce mois' as "Widget",
    COUNT(*) as "Nombre"
FROM "WorkOrder"
WHERE status = 'ready'
AND "updatedAt" >= DATE_TRUNC('month', CURRENT_DATE)
AND "updatedAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

-- ============================================
-- Widget 3: Clients Actifs (6 derniers mois)
-- ============================================
SELECT 
    'Clients actifs (6 mois)' as "Widget",
    COUNT(DISTINCT "customerId") as "Nombre"
FROM "WorkOrder"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '6 months'
AND "customerId" IS NOT NULL;

-- ============================================
-- Détails des Tickets par Statut
-- ============================================
SELECT 
    status as "Statut",
    COUNT(*) as "Nombre de tickets"
FROM "WorkOrder"
GROUP BY status
ORDER BY status;

-- ============================================
-- Tickets Ready avec Dates
-- ============================================
SELECT 
    id,
    status,
    TO_CHAR("createdAt", 'DD/MM/YYYY HH24:MI') as "Créé le",
    TO_CHAR("updatedAt", 'DD/MM/YYYY HH24:MI') as "Mis à jour le",
    CASE 
        WHEN "updatedAt" >= DATE_TRUNC('month', CURRENT_DATE) THEN 'OUI'
        ELSE 'NON'
    END as "Terminé ce mois ?"
FROM "WorkOrder"
WHERE status = 'ready'
ORDER BY "updatedAt" DESC
LIMIT 10;

-- ============================================
-- Tickets Created (En Attente)
-- ============================================
SELECT 
    id,
    status,
    TO_CHAR("createdAt", 'DD/MM/YYYY HH24:MI') as "Créé le",
    TO_CHAR("updatedAt", 'DD/MM/YYYY HH24:MI') as "Mis à jour le"
FROM "WorkOrder"
WHERE status = 'created'
ORDER BY "createdAt" DESC
LIMIT 10;

-- ============================================
-- Résumé Global
-- ============================================
SELECT 
    'TOTAL TICKETS' as "Catégorie",
    COUNT(*) as "Nombre"
FROM "WorkOrder"
UNION ALL
SELECT 
    'En attente (created)',
    COUNT(*)
FROM "WorkOrder"
WHERE status = 'created'
UNION ALL
SELECT 
    'Terminés (ready)',
    COUNT(*)
FROM "WorkOrder"
WHERE status = 'ready'
UNION ALL
SELECT 
    'Terminés ce mois',
    COUNT(*)
FROM "WorkOrder"
WHERE status = 'ready'
AND "updatedAt" >= DATE_TRUNC('month', CURRENT_DATE)
UNION ALL
SELECT 
    'Clients uniques',
    COUNT(DISTINCT "customerId")
FROM "WorkOrder"
WHERE "customerId" IS NOT NULL;
