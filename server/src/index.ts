import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import routes from './routes';
import prisma from './prisma';
import { config } from './config';

dotenv.config();

const app = express();
const PORT = config.port;

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const reportsDir = path.join(uploadsDir, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 login/switch requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' }
});

app.use('/api/auth/login', authLimiter);

// Limit standard JSON body size to 1MB (Multer handles multi-part PDF streams separately)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Expertise Medical Clearance Portal API',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Expertise Medical Clearance Portal API', timestamp: new Date() });
});

// API Routes
app.use('/api', routes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const errorMessage = config.isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error');
  res.status(err.status || 500).json({ error: errorMessage });
});

// Guard against idle connection drops from Neon serverless pooler
process.on('unhandledRejection', (reason: any) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[FATAL] Uncaught Exception:', err);
  if (config.isProduction) {
    process.exit(1);
  }
});

// Neon Serverless compute keep-alive heartbeat to prevent auto-suspend 57P01 termination
const HEARTBEAT_INTERVAL_MS = 120_000; // Every 2 minutes
const heartbeatTimer = setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    console.warn('[DB Heartbeat] Reconnecting to Neon PostgreSQL:', err?.message || err);
    try {
      await prisma.$disconnect();
      await prisma.$connect();
    } catch (_) {}
  }
}, HEARTBEAT_INTERVAL_MS);
heartbeatTimer.unref();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[ECC Health Portal API] running on port ${PORT}`);
  });
}

export default app;
