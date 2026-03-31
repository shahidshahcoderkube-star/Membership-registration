import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.session.deleteMany({});
  console.log(`Successfully deleted ${result.count} stale sessions from the database.`);
}

main()
  .catch((e) => {
    console.error("Error clearing sessions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
