
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb() {
  try {
    const sessionCount = await prisma.session.count();
    const sessions = await prisma.session.findMany({
      select: { id: true, shop: true, isOnline: true, expires: true }
    });
    
    console.log('--- DATABASE STATUS ---');
    console.log(`Total sessions: ${sessionCount}`);
    sessions.forEach(s => {
      console.log(`ID: ${s.id}, Shop: ${s.shop}, Online: ${s.isOnline}, Expires: ${s.expires}`);
    });
    
    const otpCount = await prisma.otpVerification.count();
    console.log(`Total OTP records: ${otpCount}`);
    
    const oauthCount = await prisma.oAuthVerification.count();
    console.log(`Total OAuth records: ${oauthCount}`);
    
    console.log('-----------------------');
  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDb();
