import { setupTestDatabase } from './helpers/db-setup';

async function globalSetup() {
  console.log('\n🎭 Playwright Global Setup - Initializing test database...\n');
  await setupTestDatabase();
  console.log('\n✅ Test database ready!\n');
}

export default globalSetup;

