"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const auditService_1 = require("../services/auditService");
const JWT_SECRET = process.env.JWT_SECRET || 'ecc-health-clearance-secret-2026';
class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }
            const user = await prisma_1.default.user.findUnique({
                where: { username: username.toLowerCase() },
                include: { vendor: true }
            });
            if (!user || !user.isActive) {
                return res.status(401).json({ error: 'Invalid credentials or inactive account' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const payload = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                vendorId: user.vendorId
            };
            const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
            await auditService_1.AuditService.log({
                userId: user.id,
                actorName: user.name,
                role: user.role,
                action: 'SIGN_IN',
                entityType: 'User',
                entityId: user.id,
                details: `User ${user.username} signed in as ${user.role}`
            });
            return res.json({
                token,
                user: {
                    ...payload,
                    vendor: user.vendor
                }
            });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async me(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await prisma_1.default.user.findUnique({
                where: { id: req.user.id },
                include: { vendor: true }
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            return res.json({
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    vendorId: user.vendorId,
                    vendor: user.vendor,
                    impersonatorId: req.user?.impersonatorId || null
                }
            });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async switchRole(req, res) {
        try {
            const isAllowed = req.user?.role === 'ADMIN' || !!req.user?.impersonatorId;
            if (!isAllowed) {
                return res.status(403).json({ error: 'Forbidden: Only administrators can switch roles' });
            }
            const adminId = req.user?.impersonatorId || req.user.id;
            const { targetRole, vendorId } = req.body;
            if (targetRole === 'ADMIN') {
                const adminUser = await prisma_1.default.user.findUnique({
                    where: { id: adminId },
                    include: { vendor: true }
                });
                if (!adminUser) {
                    return res.status(404).json({ error: 'Admin account not found' });
                }
                const payload = {
                    id: adminUser.id,
                    username: adminUser.username,
                    name: adminUser.name,
                    role: adminUser.role,
                    vendorId: adminUser.vendorId
                };
                const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
                return res.json({
                    token,
                    user: {
                        ...payload,
                        vendor: adminUser.vendor
                    }
                });
            }
            let userQuery = { role: targetRole, isActive: true };
            if (vendorId) {
                userQuery.vendorId = vendorId;
            }
            let user = await prisma_1.default.user.findFirst({
                where: userQuery,
                include: { vendor: true }
            });
            if (!user) {
                user = await prisma_1.default.user.findFirst({
                    where: { role: targetRole },
                    include: { vendor: true }
                });
            }
            if (!user) {
                return res.status(404).json({ error: `No active user found for role ${targetRole}` });
            }
            const payload = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                vendorId: user.vendorId,
                impersonatorId: adminId
            };
            const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
            return res.json({
                token,
                user: {
                    ...payload,
                    vendor: user.vendor
                }
            });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.AuthController = AuthController;
