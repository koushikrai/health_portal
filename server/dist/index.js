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
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const routes_1 = __importDefault(require("./routes"));
const prisma_1 = __importDefault(require("./prisma"));
const config_1 = require("./config");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = config_1.config.port;
// Ensure uploads directories exist
const uploadsDir = path_1.default.join(__dirname, '../uploads');
const reportsDir = path_1.default.join(uploadsDir, 'reports');
if (!fs_1.default.existsSync(reportsDir)) {
    fs_1.default.mkdirSync(reportsDir, { recursive: true });
}
// Security headers
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigins,
    credentials: true
}));
// Rate limiter for authentication endpoints
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 login/switch requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again after 15 minutes' }
});
app.use('/api/auth/login', authLimiter);
// Limit standard JSON body size to 1MB (Multer handles multi-part PDF streams separately)
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
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
    const errorMessage = config_1.config.isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error');
    res.status(err.status || 500).json({ error: errorMessage });
});
// Guard against idle connection drops from Neon serverless pooler
process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Promise Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
    if (config_1.config.isProduction) {
        process.exit(1);
    }
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
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`[ECC Health Portal API] running on port ${PORT}`);
    });
}
exports.default = app;
