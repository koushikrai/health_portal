import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export const InvoiceClearanceView: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [sesReference, setSesReference] = useState('');
  const [reviewNotes, setReviewNotes] = useState('3-Way Match Verified & Approved for Payment');
  const [clearing, setClearing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const res = await api.getInvoices();
      setInvoices(res.data.invoices);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAudit = async (invoiceId: string) => {
    try {
      const res = await api.auditInvoice(invoiceId);
      setSelectedAudit(res.data);
      setSesReference(`SES-${Math.floor(10000 + Math.random() * 90000)}`);
    } catch (e: any) {
      alert(`Audit fetch failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleClear = async () => {
    if (!selectedAudit) return;
    try {
      setClearing(true);
      await api.clearInvoice(selectedAudit.invoice.id, {
        sesReference,
        reviewNotes
      });
      setSelectedAudit(null);
      loadInvoices();
    } catch (e: any) {
      alert(`Clearance failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setClearing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAudit || !rejectReason) return;
    try {
      setRejecting(true);
      await api.rejectInvoice(selectedAudit.invoice.id, rejectReason);
      setSelectedAudit(null);
      setRejectReason('');
      loadInvoices();
    } catch (e: any) {
      alert(`Rejection failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-2xl">receipt_long</span>
          <div>
            <h2 className="font-display font-extrabold text-xl text-slate-900">Finance Invoice Clearance & 3-Way Match</h2>
            <p className="text-xs text-slate-400">Reconcile clinic billing against contracted SAP material rates and completed medical reports</p>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700">Submitted Clinic Invoices</span>
          <span className="text-xs text-slate-400">Total: {invoices.length} Invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Clinic Billing Ref</th>
                <th className="py-3 px-4">Medical Center</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">15% VAT</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4">SES Reference</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.id}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-secondary">{inv.invoiceNo}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{inv.vendor?.name}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">SAR {Number(inv.subtotal).toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">SAR {Number(inv.vatAmount).toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-secondary text-sm">SAR {Number(inv.totalAmount).toFixed(2)}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{inv.sesReference || '---'}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      inv.status === 'CLEARED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : inv.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleAudit(inv.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">fact_check</span>
                      <span>3-Way Audit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3-Way Audit Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[22px]">policy</span>
                <div>
                  <h3 className="font-display font-bold text-sm">3-Way Reconciliation Audit: Invoice #{selectedAudit.invoice.invoiceNo}</h3>
                  <p className="text-[10.5px] text-slate-400 font-mono">Clinic: {selectedAudit.invoice.vendor?.name} &bull; SAP Vendor: {selectedAudit.invoice.vendor?.sapVendorNo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAudit(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Reconciliation Banner */}
            <div className={`p-4 border-b text-xs flex items-center justify-between ${
              selectedAudit.hasVariances
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">
                  {selectedAudit.hasVariances ? 'warning' : 'check_circle'}
                </span>
                <span className="font-bold">
                  {selectedAudit.hasVariances
                    ? `Price Variance Detected! (${selectedAudit.varianceCount} line item deviations against contract)`
                    : '3-Way Match Reconciled: All test packages match contract rate schedule and completed exams'}
                </span>
              </div>
              <span className="font-mono font-bold">
                Total Billed: SAR {selectedAudit.calculatedTotal.toFixed(2)} (incl. 15% VAT)
              </span>
            </div>

            {/* Line Items Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                    <th className="py-2.5 px-3">Request Ref</th>
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">SAP Test Package</th>
                    <th className="py-2.5 px-3 text-right">Contract Rate</th>
                    <th className="py-2.5 px-3 text-right">Billed Rate</th>
                    <th className="py-2.5 px-3 text-right">Variance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {selectedAudit.auditedLines.map((line: any) => (
                    <tr key={line.requestId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{line.requestId}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{line.employeeName}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{line.testName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">SAR {line.contractRate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">SAR {line.billedRate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {line.isVariance ? (
                          <span className="text-red-600">+SAR {line.varianceSAR.toFixed(2)}</span>
                        ) : (
                          <span className="text-emerald-600">SAR 0.00</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2 py-0.5 rounded">
                          Exam Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* SES & Review Section */}
              <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    SAP Service Entry Sheet (SES) Reference *
                  </label>
                  <input
                    type="text"
                    value={sesReference}
                    onChange={(e) => setSesReference(e.target.value)}
                    placeholder="e.g., SES-48201"
                    className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-xs p-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Finance Audit Review Note
                  </label>
                  <input
                    type="text"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-xs p-2.5 rounded-xl text-slate-900 focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  disabled={rejecting}
                  onClick={() => {
                    const r = prompt('Reason for invoice rejection:');
                    if (r) {
                      setRejectReason(r);
                      handleReject();
                    }
                  }}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs px-4 py-2 rounded-xl transition-colors"
                >
                  Reject Invoice
                </button>

                <button
                  disabled={clearing}
                  onClick={handleClear}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px]">verified</span>
                  <span>{clearing ? 'Clearing...' : 'Approve & Clear Invoice'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
