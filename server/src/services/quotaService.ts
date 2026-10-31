import prisma from '../prisma';

export class QuotaService {
  static async getClinicCapacity(vendorId: string) {
    const now = new Date();
    
    // Find active slot window
    const activeSlot = await prisma.clinicSlot.findFirst({
      where: {
        vendorId,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalCapacity = activeSlot ? activeSlot.totalCapacity : 50;

    // Count open/scheduled requests assigned to this clinic
    const assignedCount = await prisma.medicalRequest.count({
      where: {
        vendorId,
        status: { in: ['SUBMITTED', 'SCHEDULED'] }
      }
    });

    const availableSlots = Math.max(0, totalCapacity - assignedCount);

    return {
      vendorId,
      totalCapacity,
      assignedCount,
      availableSlots,
      utilizationPercent: totalCapacity > 0 ? Math.round((assignedCount / totalCapacity) * 100) : 0,
      hasCapacity: availableSlots > 0
    };
  }

  static async getAllClinicsCapacity() {
    const clinics = await prisma.vendor.findMany({
      where: { isActive: true }
    });

    const capacities = await Promise.all(
      clinics.map(c => this.getClinicCapacity(c.id))
    );

    return capacities;
  }
}
