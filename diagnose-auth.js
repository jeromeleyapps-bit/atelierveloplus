const { PrismaClient } = require('@prisma/client');
const { SignJWT, jwtVerify } = require('jose');

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== DIAGNOSTIC AUTHENTIFICATION COMPLET ===\n');
  
  // 1. Vérifier JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  console.log('1. JWT_SECRET:');
  console.log(`   - Défini: ${!!jwtSecret}`);
  console.log(`   - Longueur: ${jwtSecret?.length || 0} chars`);
  console.log(`   - Valeur (premiers 20 chars): ${jwtSecret?.substring(0, 20)}...`);
  
  // 2. Lister les users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true }
  });
  
  console.log(`\n2. USERS DANS LA DB (${users.length}):`);
  users.forEach(u => {
    console.log(`   - ${u.email}`);
    console.log(`     ID: ${u.id}`);
    console.log(`     Role: ${u.role}`);
    console.log(`     Active: ${u.active}`);
  });
  
  // 3. Tester génération + vérification JWT
  if (users.length > 0) {
    const testUser = users[0];
    console.log(`\n3. TEST JWT avec user: ${testUser.email}`);
    
    try {
      // Générer token
      const secret = new TextEncoder().encode(jwtSecret || 'dev-secret-CHANGE-IN-PRODUCTION-IMMEDIATELY');
      const token = await new SignJWT({
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setIssuer('atelier-velo')
        .setExpirationTime('7d')
        .sign(secret);
      
      console.log(`   ✅ Token généré (longueur: ${token.length})`);
      console.log(`   Token: ${token.substring(0, 50)}...`);
      
      // Vérifier token
      const { payload } = await jwtVerify(token, secret, {
        issuer: 'atelier-velo',
      });
      
      console.log(`   ✅ Token vérifié avec succès`);
      console.log(`   Payload:`);
      console.log(`     - userId: ${payload.userId}`);
      console.log(`     - email: ${payload.email}`);
      console.log(`     - role: ${payload.role}`);
      console.log(`     - iat: ${payload.iat} (${new Date(payload.iat * 1000).toISOString()})`);
      console.log(`     - exp: ${payload.exp} (${new Date(payload.exp * 1000).toISOString()})`);
      
    } catch (error) {
      console.log(`   ❌ ERREUR JWT: ${error.message}`);
    }
  }
  
  // 4. Vérifier les licences
  const licenses = await prisma.license.findMany({
    select: { id: true, tier: true, status: true, customerEmail: true }
  });
  
  console.log(`\n4. LICENCES (${licenses.length}):`);
  if (licenses.length === 0) {
    console.log('   ⚠️ Aucune licence trouvée');
  } else {
    licenses.forEach(l => {
      console.log(`   - ${l.customerEmail || 'N/A'}`);
      console.log(`     Tier: ${l.tier}`);
      console.log(`     Status: ${l.status}`);
    });
  }
  
  console.log('\n=== FIN DIAGNOSTIC ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
