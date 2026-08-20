import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  if (!(global as any).prisma) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    (global as any).prisma = new PrismaClient({ adapter });
  }
  prisma = (global as any).prisma;
}

export default prisma;
export * from '../generated/prisma/client';
