import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable must be defined in production environment.');
}

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: JWT_SECRET || 'ecc-health-clearance-secret-2026-dev-only',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true
};
