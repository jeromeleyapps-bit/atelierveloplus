const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  const u = await p.user.findUnique({ where: { email: "admin@test.fr" } });
  console.log(u);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
