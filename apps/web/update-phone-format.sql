-- Update phone to international format
UPDATE "Customer" 
SET phone = '+33614415262' 
WHERE email = 'jeromeleyssard@gmail.com';

-- Verify
SELECT id, "firstName", "lastName", email, phone 
FROM "Customer" 
WHERE email = 'jeromeleyssard@gmail.com';
