import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const res = await api.getAuditLogs();
      setLogs(res.data.logs);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTargetEntity = (l: any) => {
    if (l.entityType === 'User') {
      if (l.targetName) {
        return `User: ${l.targetName}`;
      }
      // Fallback extraction from event details
      const impersonateMatch = l.details?.match(/impersonating ([^)]+)/);
      if (impersonateMatch) {
        return `User: ${impersonateMatch[1]}`;
      }
      const signedInMatch = l.details?.match(/User ([^\s]+) signed in/);
      if (signedInMatch) {
        return `User: ${signedInMatch[1]}`;
      }
      return l.actorName ? `User: ${l.actorName}` : (l.entityId ? `User #${l.entityId.slice(0, 8)}` : 'User');
    }

    return `${l.entityType} ${l.entityId ? `#${l.entityId}` : ''}`.trim();
  };

  const filteredLogs = logs.filter(l =>
    l.actorName.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    (l.targetName && l.targetName.toLowerCase().includes(search.toLowerCase())) ||
    (l.entityId && l.entityId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-2xl">history</span>
          <div>
            <h2 className="font-display font-extrabold text-xl text-slate-900">System Audit Trail & Compliance Ledger</h2>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by actor, action, reference ID..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-secondary shadow-sm"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Logged Events: <strong className="text-slate-800">{logs.length}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{l.actorName}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded">
                      {l.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-secondary text-[11px]">{l.action}</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                    {formatTargetEntity(l)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
