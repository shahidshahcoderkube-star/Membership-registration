import { PrismaClient } from '@prisma/client';

async function testConnection(url, label) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });
  try {
    console.log(`Attempting to connect to ${label}...`);
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log(`${label} successful:`, result);
    return true;
  } catch (error) {
    console.error(`${label} failed:`, error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const password = 'w2aRDGpniAwChUyJ';
  const projectRef = 'hjcgncrsdoasshbneevq';
  
  // Try 1: Direct connection
  const directUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;
  await testConnection(directUrl, 'Direct Connection');

  // Try 2: Alternative Pooler Host (New format)
  const poolerUrl = `postgresql://postgres.${projectRef}:${password}@${projectRef}.supabase.pooler.com:6543/postgres?pgbouncer=true`;
  await testConnection(poolerUrl, 'Pooler (New Format)');
  
  // Try 3: Current .env URL
  const envUrl = `postgresql://postgres.${projectRef}:${password}@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  await testConnection(envUrl, 'Current .env Pooler');
}

main();
