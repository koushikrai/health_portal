import { PrismaClient } from '@prisma/client';

// Use direct unpooled connection for persistent Node Express server to avoid pgBouncer idle drops
const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  log: ['warn', 'error'],
});

export default prisma;
