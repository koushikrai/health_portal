"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
const zod_1 = require("zod");
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.issues || [];
                res.status(400).json({
                    error: 'Validation error: ' + issues.map((e) => `${e.path.join('.') || 'body'}: ${e.message}`).join(', '),
                    details: issues
                });
                return;
            }
            res.status(400).json({ error: 'Invalid request payload' });
        }
    };
};
exports.validateBody = validateBody;
