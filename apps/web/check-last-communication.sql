-- Check last communication sent
SELECT 
  id, 
  type, 
  event, 
  status, 
  recipient, 
  "sentAt",
  "createdAt"
FROM "Communication" 
ORDER BY "createdAt" DESC 
LIMIT 1;
