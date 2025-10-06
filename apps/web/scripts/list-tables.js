const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const rows = await p.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(rows.map(r => r.name));
  await p.$disconnect();
})().catch(e => {
  console.error(e);
  process.exit(1);
});