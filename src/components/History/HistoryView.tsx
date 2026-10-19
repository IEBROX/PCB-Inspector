import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  FileSpreadsheet,
  FileJson,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Printer,
  ShieldAlert,
  ArrowRight,
  X
} from 'lucide-react';
import { InspectionRecord } from '../../types';
import { api } from '../../api/backendClient';
import { InspectionModal } from './InspectionModal';

interface HistoryViewProps {
  onOpenStudio: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onOpenStudio }) => {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Review Required' | 'Unverified'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getHistory(100, 0);
      setRecords(data);
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete inspection record #${id}?`)) {
      await api.deleteInspection(id);
      fetchHistory();
    }
  };

  const handleConfirmClearAll = async () => {
    await api.clearHistory();
    setShowClearConfirm(false);
    fetchHistory();
  };

  const handleExportCSV = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  const handleExportJSON = () => {
    window.open(api.getExportJsonUrl(), '_blank');
  };

  // Filter records by search query, status, and date
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    return records.filter((r) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        r.filename.toLowerCase().includes(query) ||
        String(r.id).includes(query);

      // Status matching
      let matchesStatus = true;
      const recStatus = r.status || (r.model_name === 'yolov8n.pt' ? 'Unverified' : (r.defect_count > 0 ? 'Review Required' : 'Completed'));
      if (statusFilter !== 'all') {
        matchesStatus = recStatus === statusFilter;
      }

      // Date matching
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const recTime = new Date(r.timestamp).getTime();
        if (dateFilter === 'today') {
          matchesDate = recTime >= todayStart;
        } else if (dateFilter === 'week') {
          matchesDate = recTime >= weekStart;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [records, searchQuery, statusFilter, dateFilter]);

  const renderStatusBadge = (status?: string, defectCount: number = 0) => {
    if (status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    }
    if (status === 'Review Required' || defectCount > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#DC2011] bg-[#380F17] border border-[#8F0B13]">
          <AlertTriangle className="w-3 h-3" />
          Review Required
        </span>
      );
    }
    if (status === 'Unverified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/60" title="Evaluated with generic or unverified model">
          <ShieldAlert className="w-3 h-3" />
          Unverified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#B7B7BA] bg-[#252B2B] border border-[#4C4F54]">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
      {/* Inspection Details Modal / Drawer */}
      {selectedRecord && (
        <InspectionModal
          inspection={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* Confirmation Dialog for Bulk Deletion */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-elevated border border-[rgba(143,11,19,0.5)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#DC2011]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-[#EFDFC5]">
                Clear All Inspection History?
              </h3>
            </div>
            <p className="text-xs text-[#B7B7BA] leading-relaxed">
              This action will permanently delete all stored inspection records and their associated annotated image files from the local datastore. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] text-xs font-medium border border-[rgba(239,223,197,0.15)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="px-4 py-2 rounded-lg bg-[#8F0B13] hover:bg-[#DC2011] text-[#EFDFC5] text-xs font-semibold border border-[#8F0B13] shadow-[0_0_12px_rgba(220,32,17,0.35)] transition-colors"
              >
                Confirm Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="h-12 border-b border-[rgba(239,223,197,0.12)] bg-[rgba(24,20,22,0.85)] backdrop-blur-md px-5 flex items-center justify-between gap-4 flex-shrink-0 select-none shadow-sm">
        <div className="flex items-center gap-3">
          <History className="w-4 h-4 text-[#DC2011]" />
          <h1 className="font-semibold text-xs text-[#EFDFC5] tracking-wide uppercase font-mono">
            History & Reports
          </h1>
          <span className="text-[11px] text-[#B7B7BA] font-mono hidden sm:inline">
            ({records.length} total inspections)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#B7B7BA] hover:text-[#EFDFC5] border border-[rgba(239,223,197,0.15)] transition-colors shadow-sm"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] border border-[rgba(239,223,197,0.15)] hover:border-[rgba(220,32,17,0.4)] text-xs font-mono transition-all shadow-sm"
            title="Download CSV Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#DC2011]" />
            Export CSV
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] border border-[rgba(239,223,197,0.15)] hover:border-[rgba(220,32,17,0.4)] text-xs font-mono transition-all shadow-sm"
            title="Download JSON Report"
          >
            <FileJson className="w-3.5 h-3.5 text-[#EFDFC5]" />
            Export JSON
          </button>

          {records.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#380F17] hover:bg-[#8F0B13] text-[#EFDFC5] border border-[#8F0B13] text-xs font-mono transition-colors ml-1 shadow-sm"
              title="Clear all records"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#DC2011]" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 border-b border-[rgba(239,223,197,0.12)] bg-[rgba(22,18,20,0.88)] backdrop-blur-md flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-[220px] max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#B7B7BA] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename or ID..."
              className="glass-input w-full pl-8 pr-3 py-1.5 text-xs font-sans placeholder-[#B7B7BA]/50 focus:outline-none focus:border-[#DC2011]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-mono text-[#B7B7BA]">Status:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-[rgba(20,16,18,0.85)] border border-[rgba(239,223,197,0.14)] text-xs">
              {(['all', 'Completed', 'Review Required', 'Unverified'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    statusFilter === st
                      ? 'bg-[#380F17] text-[#EFDFC5] font-semibold border border-[#8F0B13]'
                      : 'text-[#B7B7BA] hover:text-[#EFDFC5]'
                  }`}
                >
                  {st === 'all' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-mono text-[#B7B7BA]">Date:</span>
            <div className="flex items-center p-0.5 rounded-lg bg-[rgba(20,16,18,0.85)] border border-[rgba(239,223,197,0.14)] text-xs">
              {(['all', 'today', 'week'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                    dateFilter === d
                      ? 'bg-[rgba(38,34,36,0.9)] text-[#EFDFC5] font-semibold border border-[rgba(239,223,197,0.18)]'
                      : 'text-[#B7B7BA] hover:text-[#EFDFC5]'
                  }`}
                >
                  {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : 'Last 7 Days'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Clean History Table: Reduced Horizontal Clutter */}
      {/* Required Columns: Thumbnail, Filename, Timestamp, Detection Count, Inspection Status, Actions */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {filteredRecords.length > 0 ? (
          <div className="glass-panel rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[rgba(30,26,28,0.95)] backdrop-blur-sm border-b border-[rgba(239,223,197,0.12)] text-[#B7B7BA] font-mono text-[11px]">
                  <th className="py-2.5 px-4 w-16">Thumbnail</th>
                  <th className="py-2.5 px-4">Filename</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Detection Count</th>
                  <th className="py-2.5 px-4">Inspection Status</th>
                  <th className="py-2.5 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(239,223,197,0.06)]">
                {filteredRecords.map((r) => {
                  const thumbUrl = r.annotated_image_path
                    ? api.getStorageImageUrl(r.annotated_image_path)
                    : null;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedRecord(r)}
                      className="hover:bg-[rgba(48,40,43,0.35)] transition-colors cursor-pointer group"
                    >
                      {/* 1. Thumbnail */}
                      <td className="py-2 px-4">
                        <div className="w-10 h-10 rounded-lg bg-[rgba(16,13,14,0.9)] border border-[rgba(239,223,197,0.15)] overflow-hidden flex items-center justify-center flex-shrink-0">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt="thumb"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Layers className="w-4 h-4 text-[#B7B7BA]" />
                          )}
                        </div>
                      </td>

                      {/* 2. Filename */}
                      <td className="py-2 px-4">
                        <div className="font-medium text-[#EFDFC5] truncate max-w-[240px]">
                          {r.filename}
                        </div>
                        <span className="font-mono text-[10px] text-[#B7B7BA]">
                          Record #{r.id}
                        </span>
                      </td>

                      {/* 3. Timestamp */}
                      <td className="py-2 px-4 font-mono text-[#B7B7BA] text-[11px] whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleDateString()} {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* 4. Detection Count */}
                      <td className="py-2 px-4">
                        <span
                          className={`font-mono font-semibold px-2.5 py-0.5 rounded text-[11px] ${
                            r.defect_count > 0
                              ? 'bg-[#380F17] text-[#EFDFC5] border border-[#8F0B13]'
                              : 'bg-[rgba(20,16,18,0.85)] text-[#B7B7BA] border border-[rgba(239,223,197,0.12)]'
                          }`}
                        >
                          {r.defect_count} {r.defect_count === 1 ? 'defect' : 'defects'}
                        </span>
                      </td>

                      {/* 5. Inspection Status */}
                      <td className="py-2 px-4">
                        {renderStatusBadge(r.status, r.defect_count)}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(r);
                            }}
                            className="p-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.9)] text-[#EFDFC5] border border-[rgba(239,223,197,0.12)] transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(r.id, e)}
                            className="p-1.5 rounded-lg bg-[rgba(38,34,36,0.5)] hover:bg-[#380F17] text-[#B7B7BA] hover:text-[#DC2011] border border-[rgba(239,223,197,0.12)] hover:border-[#8F0B13] transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-[#B7B7BA] text-xs">
            {records.length === 0 ? (
              <div className="space-y-3">
                <p>No historical inspection records in SQLite datastore.</p>
                <button
                  onClick={onOpenStudio}
                  className="px-4 py-2 rounded-lg bg-[#8F0B13] hover:bg-[#DC2011] text-[#EFDFC5] font-semibold text-xs transition-colors border border-[#8F0B13] shadow-[0_0_12px_rgba(220,32,17,0.35)]"
                >
                  Start New Inspection
                </button>
              </div>
            ) : (
              'No inspection records matching current search or filters.'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
