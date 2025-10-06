/**
 * Script to create the first admin user
 * Run with: npx ts-node scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('🔐 Creating admin user...\n');

  const email = await question('Email: ');
  const name = await question('Name (optional): ');
  const password = await question('Password: ');

  if (!email || !password) {
    console.error('❌ Email and password are required');
    process.exit(1);
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌ User with email ${email} already exists`);
    process.exit(1);
  }

  // Hash password
  const hashedPassword = await hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      password: hashedPassword,
      role: 'admin',
      active: true,
    },
  });

  console.log('\n✅ Admin user created successfully!');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log('\n🎉 You can now login at /login');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
