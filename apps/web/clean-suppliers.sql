-- Nettoyage complet des données fournisseurs
-- Pour repartir sur une base propre avec les vraies API

-- 1. Supprimer les offres en cache
DELETE FROM "SupplierOffer";

-- 2. Supprimer les credentials utilisateurs
DELETE FROM "SupplierCredential";

-- 3. Supprimer les items fournisseurs
DELETE FROM "SupplierItem";

-- 4. Supprimer les fournisseurs
DELETE FROM "Supplier";

-- Vérification
SELECT 'SupplierOffer' as table_name, COUNT(*) as count FROM "SupplierOffer"
UNION ALL
SELECT 'SupplierCredential', COUNT(*) FROM "SupplierCredential"
UNION ALL
SELECT 'SupplierItem', COUNT(*) FROM "SupplierItem"
UNION ALL
SELECT 'Supplier', COUNT(*) FROM "Supplier";

-- Résultat attendu : 0 partout
