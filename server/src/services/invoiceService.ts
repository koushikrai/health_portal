import { InvoiceRepository } from '../repositories/invoiceRepository';
import { MasterRepository } from '../repositories/masterRepository';

export interface AuditLineItem {
  requestId: string;
  employeeName: string;
  employeeNo: string;
  testName: string;
  contractRate: number;
  billedRate: number;
  isVariance: boolean;
  varianceSAR: number;
  isCompleted: boolean;
}

export class InvoiceService {
  static async auditInvoice(invoiceId: string) {
    const invoice = await InvoiceRepository.findById(invoiceId);

    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Fetch active contract rates for this clinic via Data Tier
    const contract = await MasterRepository.findLatestContractByVendor(invoice.vendorId);

    const rateMap: Record<string, number> = {};
    if (contract) {
      for (const r of contract.rates) {
        rateMap[r.testId] = Number(r.rate);
      }
    }

    const auditedLines: AuditLineItem[] = [];
    let calculatedSubtotal = 0;
    let totalVariances = 0;

    for (const item of invoice.lineItems) {
      const testId = item.request.testId;
      const expectedRate = rateMap[testId] ?? Number(item.contractRate);
      const actualBilled = Number(item.billedRate);
      const variance = actualBilled - expectedRate;
      const hasVariance = Math.abs(variance) > 0.01;

      if (hasVariance) totalVariances += 1;
      calculatedSubtotal += actualBilled;

      auditedLines.push({
        requestId: item.requestId,
        employeeName: item.request.employee.name,
        employeeNo: item.request.employee.employeeNo,
        testName: item.request.test.name,
        contractRate: expectedRate,
        billedRate: actualBilled,
        isVariance: hasVariance,
        varianceSAR: variance,
        isCompleted: item.request.status === 'COMPLETED'
      });
    }

    const calculatedVat = Number((calculatedSubtotal * 0.15).toFixed(2));
    const calculatedTotal = Number((calculatedSubtotal + calculatedVat).toFixed(2));

    return {
      invoice,
      auditedLines,
      calculatedSubtotal,
      calculatedVat,
      calculatedTotal,
      hasVariances: totalVariances > 0,
      varianceCount: totalVariances,
      allTestsCompleted: auditedLines.every(l => l.isCompleted)
    };
  }
}
