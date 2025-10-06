-- Update P2R supplier to use P2R connector instead of MOCK
-- Run this script to enable P2R real search

UPDATE "Supplier" 
SET "connectorType" = 'P2R' 
WHERE name LIKE '%P2R%';

-- Verify the change
SELECT id, name, "connectorType", active 
FROM "Supplier" 
WHERE name LIKE '%P2R%';
