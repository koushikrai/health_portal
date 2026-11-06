"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const routes_1 = __importDefault(require("./routes"));
const prisma_1 = __importDefault(require("./prisma"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Ensure uploads directories exist
const uploadsDir = path_1.default.join(__dirname, '../uploads');
const reportsDir = path_1.default.join(uploadsDir, 'reports');
if (!fs_1.default.existsSync(reportsDir)) {
    fs_1.default.mkdirSync(reportsDir, { recursive: true });
}
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Static file serving for uploaded PDFs and certificates
app.use('/uploads', express_1.default.static(uploadsDir));
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
app.use('/api', routes_1.default);
// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});
// Guard against idle connection drops from Neon serverless pooler
process.on('unhandledRejection', (reason) => {
    console.warn('[Server Warning] Handled async rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
    console.warn('[Server Warning] Handled uncaught exception:', err?.message || err);
});
// Neon Serverless compute keep-alive heartbeat to prevent auto-suspend 57P01 termination
const HEARTBEAT_INTERVAL_MS = 120_000; // Every 2 minutes
const heartbeatTimer = setInterval(async () => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
    }
    catch (err) {
        console.warn('[DB Heartbeat] Reconnecting to Neon PostgreSQL:', err?.message || err);
        try {
            await prisma_1.default.$disconnect();
            await prisma_1.default.$connect();
        }
        catch (_) { }
    }
}, HEARTBEAT_INTERVAL_MS);
heartbeatTimer.unref();
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`[ECC Health Portal API] running on port ${PORT}`);
    });
}
exports.default = app;
