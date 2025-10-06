const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const u = await p.user.upsert({
    where: { email: "admin@test.fr" },
    update: { active: true, role: "admin" },
    create: {
      email: "admin@test.fr",
      name: "Admin",
      // hash de "password123"
      password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Brq3EW",
      role: "admin",
      active: true,
    },
  });
  console.log("Upserted:", u.email);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
