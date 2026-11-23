import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuditService } from '../services/auditService';
import { SettingsService } from '../services/settingsService';
import { UserRepository } from '../repositories/userRepository';
import { VendorRepository } from '../repositories/vendorRepository';
import { RequestRepository } from '../repositories/requestRepository';
import { ReportRepository } from '../repositories/reportRepository';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { SlotRepository } from '../repositories/slotRepository';
import { MasterRepository } from '../repositories/masterRepository';

export class AdminController {
  // ==========================================
  // 1. Users Management
  // ==========================================
  static async listUsers(req: Request, res: Response) {
    try {
      const users = await UserRepository.listAllWithCounts();

      // Sanitize password hashes
      const sanitized = users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        vendorId: u.vendorId,
        vendor: u.vendor,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        requestsCount: u._count.requests,
        auditLogsCount: u._count.auditLogs
      }));

      return res.json({ users: sanitized });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async createUser(req: Request, res: Response) {
    try {
      const { username, name, role, password, vendorId, isActive } = req.body;
      if (!username || !name || !role || !password) {
        return res.status(400).json({ error: 'Username, name, role, and password are required' });
      }

      // Check if username taken
      const existing = await UserRepository.findByUsername(username);
      if (existing) {
        return res.status(400).json({ error: `Username '${username}' is already in use` });
      }

      // If CLINIC role, vendorId is recommended
      if (role === Role.CLINIC && !vendorId) {
        return res.status(400).json({ error: 'Clinic role must be linked to an accredited medical center (vendorId)' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await UserRepository.create({
        username,
        name: name.trim(),
        role: role as Role,
        passwordHash,
        vendorId: vendorId || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'CREATE_USER',
        entityType: 'User',
        entityId: user.id,
        details: `Admin created user '${user.username}' with role '${user.role}'${user.vendor ? ` (Clinic: ${user.vendor.name})` : ''}`
      });

      return res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          vendorId: user.vendorId,
          vendor: user.vendor,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, role, vendorId, isActive, password } = req.body;

      const user = await UserRepository.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (role !== undefined) updateData.role = role as Role;
      if (vendorId !== undefined) updateData.vendorId = vendorId || null;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (password && password.trim()) {
        updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
      }

      const updated = await UserRepository.update(id, updateData);

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'UPDATE_USER',
        entityType: 'User',
        entityId: id,
        details: `Admin updated user '${updated.username}' (Role: ${updated.role}, Active: ${updated.isActive})`
      });

      return res.json({
        user: {
          id: updated.id,
          username: updated.username,
          name: updated.name,
          role: updated.role,
          vendorId: updated.vendorId,
          vendor: updated.vendor,
          isActive: updated.isActive,
          updatedAt: updated.updatedAt
        }
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        return res.status(400).json({ error: 'Cannot delete your own active administrator account' });
      }

      const user = await UserRepository.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user has associated records
      const hasRequests = await RequestRepository.count({ createdById: id });
      if (hasRequests > 0) {
        // Deactivate instead of hard delete to preserve audit integrity
        await UserRepository.update(id, { isActive: false });

        await AuditService.log({
          userId: req.user?.id,
          actorName: req.user?.name || 'Administrator',
          role: Role.ADMIN,
          action: 'DEACTIVATE_USER',
          entityType: 'User',
          entityId: id,
          details: `Deactivated user '${user.username}' with ${hasRequests} historical clearance requests`
        });

        return res.json({ message: `User '${user.username}' deactivated (historical records preserved)` });
      }

      await UserRepository.delete(id);

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: id,
        details: `Permanently removed user account '${user.username}'`
      });

      return res.json({ message: `User '${user.username}' permanently deleted` });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // 2. Clinics & Vendors Management
  // ==========================================
  static async createClinic(req: Request, res: Response) {
    try {
      const {
        code,
        name,
        sapVendorNo,
        crNumber,
        vatNumber,
        tier,
        saudization,
        notes,
        contractNo: customContractNo,
        paymentTerms,
        invoicingType
      } = req.body;

      if (!code || !name) {
        return res.status(400).json({ error: 'Clinic code and name are required' });
      }

      const cleanCode = code.toUpperCase().trim();
      const existingVendor = await VendorRepository.findByCode(cleanCode);
      if (existingVendor) {
        return res.status(400).json({ error: `Provider code '${cleanCode}' is already registered.` });
      }

      // Autogenerate sequential ID if needed (e.g. V6, V7)
      const existingVendors = await VendorRepository.listAllIds();
      let maxV = 5;
      existingVendors.forEach(v => {
        const m = v.id.match(/^V(\d+)$/);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxV) maxV = num;
        }
      });
      const id = `V${maxV + 1}`;

      const clinic = await VendorRepository.create({
        id,
        code: cleanCode,
        name: name.trim(),
        sapVendorNo: sapVendorNo || null,
        crNumber: crNumber || null,
        vatNumber: vatNumber || null,
        tier: tier || 'Tier 1 Primary',
        saudization: saudization ? Number(saudization) : 40.0,
        notes: notes || 'Accredited Medical Center',
        isActive: true
      });

      // Automatically create an active contract with sequential SAP outline agreement number
      const existingContractsCount = await MasterRepository.countContracts();
      const contractNo = customContractNo ? String(customContractNo).trim() : `462000${String(existingContractsCount + 1001).padStart(4, '0')}`;
      const contract = await MasterRepository.createContract({
        vendorId: clinic.id,
        contractNo,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        invoicingType: invoicingType || 'Ariba portal',
        paymentTerms: paymentTerms ? Number(paymentTerms) : 30,
        notes: ['Contract generated via Medical Provider Registry']
      });

      // Attach benchmark rate schedule for primary standard tests
      const benchmarkRates: Array<{ testId: string; rate: number }> = [
        { testId: '5004955', rate: 185.0 }, // Sadara Medical
        { testId: '5004959', rate: 110.0 }, // SABIC Screening
        { testId: '5004961', rate: 40.0 },  // Aramco driver
        { testId: '5004956', rate: 50.0 },  // Iqama medical
        { testId: '5004966', rate: 35.0 }   // Driving licence
      ];

      for (const br of benchmarkRates) {
        try {
          const testExists = await MasterRepository.findTestById(br.testId);
          if (testExists) {
            await MasterRepository.createContractRate({
              contractId: contract.id,
              testId: br.testId,
              rate: br.rate,
              includesVat: false
            });
          }
        } catch (_) {
          // Ignore rate insert error if already exists
        }
      }

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Medical Administrator',
        role: req.user?.role || Role.ADMIN,
        action: 'CREATE_CLINIC',
        entityType: 'Vendor',
        entityId: clinic.id,
        details: `Onboarded new accredited clinic '${clinic.name}' (${clinic.code}) with SAP Vendor #${clinic.sapVendorNo || 'N/A'}`
      });

      return res.status(201).json({
        success: true,
        clinic,
        message: `Successfully onboarded ${clinic.name} (${clinic.code}) with Contract #${contractNo}!`
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async updateClinic(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, sapVendorNo, crNumber, vatNumber, tier, saudization, status, notes, isActive } = req.body;

      const clinic = await VendorRepository.update(id, {
        name: name !== undefined ? name.trim() : undefined,
        sapVendorNo: sapVendorNo !== undefined ? sapVendorNo : undefined,
        crNumber: crNumber !== undefined ? crNumber : undefined,
        vatNumber: vatNumber !== undefined ? vatNumber : undefined,
        tier: tier !== undefined ? tier : undefined,
        saudization: saudization !== undefined ? Number(saudization) : undefined,
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'UPDATE_CLINIC',
        entityType: 'Vendor',
        entityId: id,
        details: `Updated clinic '${clinic.name}' (${clinic.code})`
      });

      return res.json({ clinic });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async deleteClinic(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const clinic = await VendorRepository.findById(id);
      if (!clinic) return res.status(404).json({ error: 'Clinic not found' });

      // Clean up relations & delete clinic through Data Tier repository
      await VendorRepository.delete(id);

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: req.user?.role || Role.ADMIN,
        action: 'DELETE_CLINIC',
        entityType: 'Vendor',
        entityId: id,
        details: `Deleted accredited clinic '${clinic.name}' (${clinic.code})`
      });

      return res.json({ success: true, message: `Successfully removed clinic ${clinic.name}` });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // 3. Contracts & Rate Cards
  // ==========================================
  static async createContract(req: Request, res: Response) {
    try {
      const { vendorId, contractNo, quoteNo, startDate, endDate, invoicingType, paymentTerms, notes } = req.body;
      if (!vendorId || !contractNo) {
        return res.status(400).json({ error: 'vendorId and contractNo are required' });
      }

      const contract: any = await MasterRepository.createContract({
        vendorId,
        contractNo: String(contractNo).trim(),
        quoteNo: quoteNo ? String(quoteNo).trim() : null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        invoicingType: invoicingType || 'Ariba portal',
        paymentTerms: paymentTerms ? Number(paymentTerms) : 30,
        notes: Array.isArray(notes) ? notes : notes ? [notes] : []
      }, true);

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'CREATE_CONTRACT',
        entityType: 'Contract',
        entityId: contract.id,
        details: `Created SAP Contract #${contract.contractNo} for clinic ${contract.vendor?.name || vendorId}`
      });

      return res.status(201).json({ contract });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async addContractRate(req: Request, res: Response) {
    try {
      const { contractId, testId, rate, includesVat } = req.body;
      if (!contractId || !testId || rate === undefined) {
        return res.status(400).json({ error: 'contractId, testId, and rate are required' });
      }

      const contractRate = await MasterRepository.upsertContractRate(
        contractId,
        testId,
        Number(rate),
        Boolean(includesVat)
      );

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'SET_CONTRACT_RATE',
        entityType: 'ContractRate',
        entityId: contractRate.id,
        details: `Configured rate SAR ${rate} for test ${contractRate.test.name} under contract ${contractId}`
      });

      return res.status(201).json({ contractRate });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async deleteContractRate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await MasterRepository.deleteContractRate(id);
      return res.json({ message: 'Rate card entry removed' });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // 4. System Overview & Stats
  // ==========================================
  static async getSystemOverview(req: Request, res: Response) {
    try {
      const [
        totalUsers,
        activeUsers,
        totalClinics,
        activeClinics,
        totalContracts,
        totalRates,
        totalRequests,
        totalReports,
        totalInvoices,
        roleStats
      ] = await Promise.all([
        UserRepository.count(),
        UserRepository.count({ isActive: true }),
        VendorRepository.count(),
        VendorRepository.count({ isActive: true }),
        MasterRepository.countContracts(),
        MasterRepository.countContractRates(),
        RequestRepository.count(),
        ReportRepository.count(),
        InvoiceRepository.count(),
        UserRepository.groupByRole()
      ]);

      const roleBreakdown: Record<string, number> = {};
      roleStats.forEach(r => {
        roleBreakdown[r.role] = r._count.id;
      });

      return res.json({
        totalUsers,
        activeUsers,
        totalClinics,
        activeClinics,
        totalContracts,
        totalRates,
        totalRequests,
        totalReports,
        totalInvoices,
        roleBreakdown
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ==========================================
  // 5. System Settings & Slot Expiry Governance
  // ==========================================
  static async getSettings(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getSettings();
      const expiryDays = settings.slotExpiryDays || 7;

      // Query all slot requests via Data Tier to assess active vs expired status
      const slotRequests = await SlotRepository.list();

      const now = new Date();
      const slotsWithExpiry = slotRequests.map(sr => {
        const createdDate = new Date(sr.createdAt);
        const ageMs = now.getTime() - createdDate.getTime();
        const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
        const isExpired = sr.status === 'EXPIRED' || (settings.autoExpireSlots && ageDays >= expiryDays);
        const daysRemaining = Math.max(0, expiryDays - ageDays);

        return {
          id: sr.id,
          title: sr.title,
          testName: sr.test?.name || sr.title,
          department: sr.department,
          plant: sr.plant,
          requestedSlots: sr.requestedSlots,
          allocatedSlots: sr.allocatedSlots,
          status: isExpired ? 'EXPIRED' : sr.status,
          createdAt: sr.createdAt,
          ageDays,
          daysRemaining,
          isExpired,
          autoDisappearDate: new Date(createdDate.getTime() + expiryDays * 86400000).toISOString()
        };
      });

      const totalSlots = slotsWithExpiry.length;
      const expiredSlots = slotsWithExpiry.filter(s => s.isExpired).length;
      const activeSlots = totalSlots - expiredSlots;

      return res.json({
        settings,
        stats: {
          totalSlots,
          activeSlots,
          expiredSlots,
          slotExpiryDays: expiryDays
        },
        slots: slotsWithExpiry
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async updateSettings(req: Request, res: Response) {
    try {
      const { slotExpiryDays, autoExpireSlots, slotExpiryBasis, autoArchiveCompleted } = req.body;

      const updated = await SettingsService.updateSettings(
        {
          slotExpiryDays: slotExpiryDays !== undefined ? Number(slotExpiryDays) : undefined,
          autoExpireSlots: autoExpireSlots !== undefined ? Boolean(autoExpireSlots) : undefined,
          slotExpiryBasis: slotExpiryBasis !== undefined ? slotExpiryBasis : undefined,
          autoArchiveCompleted: autoArchiveCompleted !== undefined ? Boolean(autoArchiveCompleted) : undefined
        },
        req.user?.name || 'Administrator'
      );

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'UPDATE_SYSTEM_SETTINGS',
        entityType: 'SystemConfig',
        entityId: 'SLOT_EXPIRY_CONFIG',
        details: `Configured slot auto-disappearance window to ${updated.slotExpiryDays} days (Auto-expire: ${updated.autoExpireSlots})`
      });

      return res.json({ settings: updated });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async expireSlot(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const slotRequest = await SlotRepository.findById(id);
      if (!slotRequest) {
        return res.status(404).json({ error: 'Slot request not found' });
      }

      await SlotRepository.update(id, { status: 'EXPIRED' });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'EXPIRE_SLOT_REQUEST',
        entityType: 'SlotRequest',
        entityId: id,
        details: `Admin manually expired slot request '${id}', causing it to disappear from active allocation queue`
      });

      return res.json({ message: `Slot request '${id}' marked as EXPIRED (disappeared from queue)` });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async restoreSlot(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const slotRequest = await SlotRepository.findById(id);
      if (!slotRequest) {
        return res.status(404).json({ error: 'Slot request not found' });
      }

      const settings = await SettingsService.getSettings();
      const updated = await SlotRepository.update(id, {
        status: 'PENDING',
        createdAt: new Date()
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Administrator',
        role: Role.ADMIN,
        action: 'RESTORE_SLOT_REQUEST',
        entityType: 'SlotRequest',
        entityId: id,
        details: `Admin restored slot request '${id}', resetting its lifecycle for ${settings.slotExpiryDays} days`
      });

      return res.json({
        message: `Slot request '${id}' restored to active queue for ${settings.slotExpiryDays} days`,
        slotRequest: updated
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
