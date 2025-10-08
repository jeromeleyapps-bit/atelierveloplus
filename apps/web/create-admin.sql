-- Créer un compte admin
-- Mot de passe : "admin123" (à changer après connexion)
-- Hash bcrypt de "admin123"

INSERT INTO "User" (id, email, password, role, active, "createdAt", "updatedAt")
VALUES (
  'admin-' || gen_random_uuid()::text,
  'admin@atelier-velo.fr',
  '$2a$10$rN8eRMxGbePCpE5MXCuHu.6TwGVGvIUKrhrF5JaKxibKjXH5yH5Ky',
  'admin',
  true,
  NOW(),
  NOW()
);
