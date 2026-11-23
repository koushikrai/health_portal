"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Use direct unpooled connection for persistent Node Express server to avoid pgBouncer idle drops
const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const prisma = new client_1.PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: ['warn', 'error'],
});
exports.default = prisma;
