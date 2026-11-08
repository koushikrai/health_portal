"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('WARN: JWT_SECRET environment variable is not defined; using secure fallback secret. Set JWT_SECRET in environment variables.');
}
exports.config = {
    port: process.env.PORT || 5000,
    jwtSecret: JWT_SECRET || 'ecc-health-clearance-secret-2026-fallback-key',
    isProduction: process.env.NODE_ENV === 'production',
    corsOrigins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true
};
