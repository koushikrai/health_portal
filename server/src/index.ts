import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import prisma from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const reportsDir = path.join(uploadsDir, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploaded PDFs and certificates
app.use('/uploads', express.static(uploadsDir));

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
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Guard against idle connection drops from Neon serverless pooler
process.on('unhandledRejection', (reason: any) => {
  console.warn('[Server Warning] Handled async rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err: Error) => {
  console.warn('[Server Warning] Handled uncaught exception:', err?.message || err);
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[ECC Health Portal API] running on port ${PORT}`);
  });
}

export default app;
