"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employeeRepository_1 = require("../repositories/employeeRepository");
const eligibilityService_1 = require("../services/eligibilityService");
class EmployeeController {
    static async search(req, res) {
        try {
            const q = (req.query.q || '').trim();
            const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
            const offset = Math.max(Number(req.query.offset) || 0, 0);
            const employees = await employeeRepository_1.EmployeeRepository.search(q, limit, offset);
            return res.json({ employees });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const employee = await employeeRepository_1.EmployeeRepository.findByIdOrBadge(id);
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            return res.json({ employee });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async checkEligibility(req, res) {
        try {
            const { id } = req.params;
            const testId = req.query.testId;
            if (!testId) {
                return res.status(400).json({ error: 'Query param testId is required' });
            }
            const employee = await employeeRepository_1.EmployeeRepository.findByIdOrBadge(id);
            if (!employee) {
                return res.status(404).json({ error: 'Employee not found' });
            }
            const eligibility = await eligibilityService_1.EligibilityService.check(employee.id, testId);
            return res.json({ employee, eligibility });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.EmployeeController = EmployeeController;
