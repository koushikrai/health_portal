"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../prisma"));
const JWT_SECRET = process.env.JWT_SECRET || 'ecc-health-clearance-secret-2026';
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized: Authentication bearer token required' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Verify user exists and is active in database
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.id },
            include: { vendor: true }
        });
        if (!user || !user.isActive) {
            res.status(401).json({ error: 'Unauthorized: User account not found or inactive' });
            return;
        }
        req.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            vendorId: user.vendorId
        };
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};
exports.authenticate = authenticate;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized: Authentication required' });
            return;
        }
        if (req.user.role === client_1.Role.ADMIN || allowedRoles.includes(req.user.role)) {
            return next();
        }
        res.status(403).json({
            error: `Forbidden: Role '${req.user.role}' lacks permission for this action. Allowed: [${allowedRoles.join(', ')}]`
        });
    };
};
exports.requireRole = requireRole;
