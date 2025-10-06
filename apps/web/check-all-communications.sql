-- Check all recent communications
SELECT 
  id, 
  type, 
  event, 
  status,
  recipient,
  error,
  "sentAt",
  "createdAt"
FROM "Communication" 
ORDER BY "createdAt" DESC 
LIMIT 5;
