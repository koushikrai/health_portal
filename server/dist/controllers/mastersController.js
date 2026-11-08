"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastersController = void 0;
const masterRepository_1 = require("../repositories/masterRepository");
class MastersController {
    static async getDepartments(req, res) {
        try {
            const departments = await masterRepository_1.MasterRepository.getDepartments();
            return res.json({ departments });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getTests(req, res) {
        try {
            const tests = await masterRepository_1.MasterRepository.getTestsWithRates('id');
            return res.json({ tests });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getClinics(req, res) {
        try {
            const clinics = await masterRepository_1.MasterRepository.getClinicsWithContractsAndLatestSlot();
            return res.json({ clinics });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getRates(req, res) {
        try {
            const rates = await masterRepository_1.MasterRepository.getRatesWithContractAndTest();
            return res.json({ rates });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.MastersController = MastersController;
