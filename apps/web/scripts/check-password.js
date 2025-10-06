const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

(async () => {
  const u = await p.user.findUnique({ where: { email: "admin@test.fr" } });
  console.log("exists=", !!u, "active=", u?.active, "role=", u?.role);
  console.log("match=", u ? await bcrypt.compare("password123", u.password) : false);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
