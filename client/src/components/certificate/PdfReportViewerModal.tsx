import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

interface PdfReportViewerModalProps {
  report: {
    id?: string;
    employeeName: string;
    reportName: string;
    iqamaId?: string;
    employeeNo?: string;
    issueDate?: string;
    expiryDate?: string;
    clinicName?: string;
    fileUrl?: string;
  } | null;
  onClose: () => void;
  onUploadForRecord?: (iqama: string) => void;
}

export const PdfReportViewerModal: React.FC<PdfReportViewerModalProps> = ({
  report,
  onClose,
  onUploadForRecord
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    let createdUrl = '';

    const fetchPdf = async () => {
      if (!report) return;
      if (report.id) {
        setLoadingPdf(true);
        try {
          const res = await api.getReportPdfBlob(report.id);
          if (active && res.data) {
            createdUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            setBlobUrl(createdUrl);
          }
        } catch (e) {
          console.warn('Authenticated file stream error, checking fallback URL', e);
        } finally {
          if (active) setLoadingPdf(false);
        }
      }
    };

    fetchPdf();

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [report?.id]);

  if (!report) return null;

  // Resolve URL: use authenticated blobUrl (or external http URL if provided)
  const pdfUrl = blobUrl || (report.fileUrl && report.fileUrl.startsWith('http') ? report.fileUrl : '');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[90vh] shadow-2xl flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/20 text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                  {report.employeeName}
                </h3>
                <span className="bg-slate-800 text-emerald-400 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-slate-700">
                  Iqama: {report.iqamaId || report.employeeNo || '—'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {report.reportName} &bull; Issued by <strong className="text-slate-200">{report.clinicName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pdfUrl && (
              <>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                  title="Open in new window"
                >
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                  <span className="hidden sm:inline">Pop Out</span>
                </a>
                <a
                  href={pdfUrl}
                  download={`${report.iqamaId || report.employeeName}_Medical_Report.pdf`}
                  className="bg-primary hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Download PDF"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span className="hidden sm:inline">Download</span>
                </a>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Certificate Metadata Ribbon (The 6 Essential Data Points) */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Candidate</span>
            <span className="font-bold text-slate-900 truncate block">{report.employeeName}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Report / Screening</span>
            <span className="font-bold text-primary truncate block">{report.reportName}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Iqama / National ID</span>
            <span className="font-mono font-extrabold text-slate-800 block">{report.iqamaId || '—'}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Issue Date</span>
            <span className="font-mono text-slate-700 block">{report.issueDate || 'Today'}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Expiry Date</span>
            <span className="font-mono text-emerald-700 font-bold block">{report.expiryDate || '—'}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Issuing Clinic</span>
            <span className="font-medium text-slate-700 truncate block" title={report.clinicName}>
              {report.clinicName}
            </span>
          </div>
        </div>

        {/* PDF Document Viewport */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex flex-col items-center justify-center">
          {loadingPdf ? (
            <div className="text-center space-y-2">
              <div className="h-8 w-8 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-slate-600">Streaming authenticated PDF report...</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full rounded-xl bg-white border border-slate-300 shadow-inner"
              title={`${report.employeeName} Medical Certificate`}
            />
          ) : (
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">folder_open</span>
              </div>
              <div>
                <h4 className="font-display font-extrabold text-slate-900 text-base">
                  No PDF Attached for Iqama #{report.iqamaId}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  This clearance record was registered in the database, but the physical PDF certificate file has not been uploaded yet.
                </p>
              </div>

              {onUploadForRecord && report.iqamaId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onUploadForRecord(report.iqamaId!);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload {report.iqamaId}.pdf</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
