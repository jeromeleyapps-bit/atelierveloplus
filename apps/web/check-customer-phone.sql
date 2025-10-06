-- Check if customer has phone number
SELECT 
  id, 
  "firstName",
  "lastName",
  email,
  phone
FROM "Customer" 
WHERE email = 'jeromeleyssard@gmail.com';
