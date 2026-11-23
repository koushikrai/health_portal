"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const auditService_1 = require("../services/auditService");
const config_1 = require("../config");
const userRepository_1 = require("../repositories/userRepository");
class AuthController {
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password required' });
            }
            const user = await userRepository_1.UserRepository.findByUsername(username);
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
            const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, { expiresIn: '7d' });
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
            const user = await userRepository_1.UserRepository.findById(req.user.id);
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
                const adminUser = await userRepository_1.UserRepository.findById(adminId);
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
                const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, { expiresIn: '7d' });
                return res.json({
                    token,
                    user: {
                        ...payload,
                        vendor: adminUser.vendor
                    }
                });
            }
            const user = await userRepository_1.UserRepository.findFirstByRole(targetRole, vendorId);
            if (!user || !user.isActive) {
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
            // Impersonation token has a safe 2-hour TTL
            const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, { expiresIn: '2h' });
            await auditService_1.AuditService.log({
                userId: adminId,
                actorName: req.user?.name || 'Admin',
                role: req.user?.role || client_1.Role.ADMIN,
                action: 'ROLE_IMPERSONATE',
                entityType: 'User',
                entityId: user.id,
                details: `Administrator switched role to ${targetRole} (impersonating ${user.username})`
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
}
exports.AuthController = AuthController;
