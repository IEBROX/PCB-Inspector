import React, { useEffect, useState } from 'react';
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { InspectionStats, ModelStatus, InspectionRecord } from '../../types';
import { api } from '../../api/backendClient';
import { InspectionModal } from '../History/InspectionModal';

interface DashboardViewProps {
  onStartInspection: () => void;
  onNavigateToModel: () => void;
  onNavigateToHistory: () => void;
  modelStatus: ModelStatus | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onStartInspection,
  onNavigateToModel,
  onNavigateToHistory,
  modelStatus,
}) => {
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<InspectionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, historyData] = await Promise.all([
        api.getStats(),
        api.getHistory(5, 0).catch(() => [])
      ]);
      setStats(statsData);
      if (historyData && historyData.length > 0) {
        setRecentRecords(historyData.slice(0, 5));
      } else if (statsData.recent_inspections) {
        setRecentRecords(statsData.recent_inspections.slice(0, 5) as any);
      } else {
        setRecentRecords([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load inspection data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Standard 6 PCB Defect Classes with synchronized visual tokens
  const defectClasses = [
    { key: 'missing_hole', label: 'Missing Hole', colorHex: '#DC2011' },
    { key: 'mouse_bite', label: 'Mouse Bite', colorHex: '#EBA01E' },
    { key: 'open_circuit', label: 'Open Circuit', colorHex: '#C86432' },
    { key: 'short', label: 'Short Circuit', colorHex: '#8F0B13' },
    { key: 'spur', label: 'Spur', colorHex: '#E05060' },
    { key: 'spurious_copper', label: 'Spurious Copper', colorHex: '#23C378' },
  ];

  // Derive genuine metrics from stored backend data
  const totalInspections = stats?.total_inspections ?? 0;
  const validInspections = stats?.valid_inspections ?? 0;
  const unverifiedInspections = stats?.unverified_inspections ?? 0;
  const validDefects = stats?.total_defects_valid ?? 0;
  const verificationRate = totalInspections > 0 ? Math.round((validInspections / totalInspections) * 100) : 0;

  // Render status badge cleanly without visual noise
  const renderStatusBadge = (status?: string, defectCount: number = 0) => {
    if (status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Verified
        </span>
      );
    }
    if (status === 'Review Required' || defectCount > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#EFDFC5] bg-[rgba(143,11,19,0.35)] border border-[rgba(220,32,17,0.45)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2011]" />
          Review Required
        </span>
      );
    }
    if (status === 'Unverified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-amber-300 bg-amber-950/30 border border-amber-800/40" title="Inference ran without verified PCB model">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Unverified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#B7B7BA] bg-[rgba(38,34,36,0.6)] border border-[rgba(239,223,197,0.1)]">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-28 space-y-5 bg-transparent relative select-none">
      {/* Page Header: Title & Start Inspection Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(239,223,197,0.10)]">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#EFDFC5] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#DC2011]" />
            Inspection Dashboard
          </h1>
          <p className="text-xs text-[#B7B7BA] mt-0.5">
            Automated PCB optical defect verification & real-time telemetry
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(38,34,36,0.82)] border border-[rgba(239,223,197,0.10)] hover:border-[rgba(220,32,17,0.35)] hover:bg-[rgba(48,40,43,0.9)] text-[#EFDFC5] text-xs font-mono transition-colors shadow-sm"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#DC2011]' : 'text-[#B7B7BA]'}`} />
            Refresh
          </button>

          <button
            onClick={onStartInspection}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#DC2011] hover:bg-[#8F0B13] text-[#EFDFC5] font-semibold text-xs transition-colors border border-[rgba(220,32,17,0.5)] shadow-[0_2px_12px_rgba(220,32,17,0.3)]"
          >
            Start Inspection
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error notification banner if API fails */}
      {error && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2011]" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDashboardData} className="underline text-xs hover:text-white">Retry</button>
        </div>
      )}

      {/* Section A: Overview Statistics (Four compact cards in one row) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Inspections */}
        <div className="glass-panel glass-panel-interactive p-4 flex flex-col justify-between min-h-[104px]">
          <div className="flex items-center justify-between text-[#B7B7BA] text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Inspections</span>
            <Layers className="w-3.5 h-3.5 text-[#B7B7BA]/70" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-bold text-[#EFDFC5] font-mono tracking-tight tabular-nums">
              {totalInspections}
            </span>
          </div>
          <div className="pt-2 border-t border-[rgba(239,223,197,0.06)] text-[11px] text-[#B7B7BA] font-mono truncate">
            <span>{validInspections} verified · {unverifiedInspections} unverified</span>
          </div>
        </div>

        {/* Card 2: Valid Defects */}
        <div className="glass-panel glass-panel-interactive p-4 flex flex-col justify-between min-h-[104px]">
          <div className="flex items-center justify-between text-[#B7B7BA] text-[11px] font-semibold uppercase tracking-wider">
            <span>Valid Defects</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#DC2011]" />
          </div>
          <div className="my-1">
            <span className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${validDefects > 0 ? 'text-[#DC2011]' : 'text-[#EFDFC5]'}`}>
              {validDefects}
            </span>
          </div>
          <div className="pt-2 border-t border-[rgba(239,223,197,0.06)] text-[11px] text-[#B7B7BA] font-mono truncate">
            <span>{stats?.defective_pcbs ?? 0} defective · {stats?.clean_pcbs ?? 0} clean boards</span>
          </div>
        </div>

        {/* Card 3: Verification Status */}
        <div className="glass-panel glass-panel-interactive p-4 flex flex-col justify-between min-h-[104px]">
          <div className="flex items-center justify-between text-[#B7B7BA] text-[11px] font-semibold uppercase tracking-wider">
            <span>Verification Status</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="my-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${verificationRate === 100 && totalInspections > 0 ? 'text-emerald-400' : 'text-[#EFDFC5]'}`}>
              {totalInspections > 0 ? `${verificationRate}%` : '—'}
            </span>
            {totalInspections > 0 && verificationRate === 100 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                Optimal
              </span>
            )}
          </div>
          <div className="pt-2 border-t border-[rgba(239,223,197,0.06)] text-[11px] text-[#B7B7BA] font-mono truncate">
            <span>{validInspections} of {totalInspections} inspections verified</span>
          </div>
        </div>

        {/* Card 4: Model Readiness */}
        <div className="glass-panel glass-panel-interactive p-4 flex flex-col justify-between min-h-[104px]">
          <div className="flex items-center justify-between text-[#B7B7BA] text-[11px] font-semibold uppercase tracking-wider">
            <span>Model Readiness</span>
            <Cpu className="w-3.5 h-3.5 text-[#B7B7BA]/70" />
          </div>
          <div className="my-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              modelStatus?.loaded
                ? modelStatus.is_pcb_model
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : 'bg-amber-400'
                : 'bg-[#DC2011]'
            }`} />
            <span className={`text-xl font-bold truncate ${modelStatus?.loaded && modelStatus.is_pcb_model ? 'text-emerald-400' : 'text-[#EFDFC5]'}`}>
              {modelStatus?.loaded
                ? modelStatus.is_pcb_model
                  ? 'Ready (PCB)'
                  : 'Generic'
                : 'Offline'}
            </span>
          </div>
          <div className="pt-2 border-t border-[rgba(239,223,197,0.06)] text-[11px] text-[#B7B7BA] font-mono flex items-center justify-between">
            <span className="truncate max-w-[130px]" title={modelStatus?.model_info?.name || 'pcb_best.pt'}>
              {modelStatus?.loaded ? `${modelStatus.model_info?.name || 'pcb_best.pt'} · ${modelStatus.device?.toUpperCase() || 'CPU'}` : 'No weights'}
            </span>
            <button
              onClick={onNavigateToModel}
              className="text-[#DC2011] hover:underline font-medium text-[11px] shrink-0"
            >
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Two-Column Layout: Defect Distribution (B) & Recent Inspections (C) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Section B: Defect Distribution (5 columns on desktop) */}
        <div className="lg:col-span-5 h-full min-w-0 glass-panel p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(239,223,197,0.10)] flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-[#EFDFC5]">
                Defect Distribution
              </h2>
              <p className="text-[11px] text-[#B7B7BA] mt-0.5">
                Breakdown across 6 standard PCB fault classes
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#EFDFC5] bg-[rgba(20,16,18,0.7)] px-2.5 py-1 rounded-lg border border-[rgba(239,223,197,0.10)]">
              {validDefects} {validDefects === 1 ? 'Defect' : 'Defects'}
            </span>
          </div>

          <div className="divide-y divide-[rgba(239,223,197,0.06)] mt-2 flex-1 flex flex-col justify-between">
            {defectClasses.map((item) => {
              const count = stats?.defects_by_class?.[item.key] ?? 0;
              const pct = validDefects > 0 ? Math.round((count / validDefects) * 100) : 0;
              const isZero = count === 0;

              return (
                <div key={item.key} className="py-2.5 first:pt-1.5 last:pb-1 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={`flex items-center gap-2 font-medium ${isZero ? 'text-[#B7B7BA]/50' : 'text-[#EFDFC5]'}`}>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: item.colorHex,
                          opacity: isZero ? 0.35 : 1,
                          boxShadow: isZero ? 'none' : `0 0 6px ${item.colorHex}66`
                        }}
                      />
                      {item.label}
                    </span>
                    <span className="font-mono text-xs tabular-nums">
                      <span className={isZero ? 'text-[#B7B7BA]/40' : 'text-[#EFDFC5] font-semibold'}>
                        {count}
                      </span>
                      <span className={`text-[11px] ml-1.5 ${isZero ? 'text-[#B7B7BA]/30' : 'text-[#B7B7BA]'}`}>
                        ({pct}%)
                      </span>
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[rgba(16,13,14,0.75)] rounded-full overflow-hidden border border-[rgba(239,223,197,0.06)]">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.colorHex,
                        opacity: isZero ? 0 : 0.95
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section C: Recent Inspections (7 columns on desktop) */}
        <div className="lg:col-span-7 h-full min-w-0 glass-panel p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(239,223,197,0.10)] flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-[#EFDFC5]">
                Recent Inspections
              </h2>
              <p className="text-[11px] text-[#B7B7BA] mt-0.5">
                Latest 5 optical inspection records
              </p>
            </div>
            <button
              onClick={onNavigateToHistory}
              className="text-xs text-[#EFDFC5] hover:text-[#DC2011] flex items-center gap-1 font-mono transition-colors group"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="mt-2 overflow-x-auto flex-1 flex flex-col justify-between">
            {recentRecords.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[rgba(239,223,197,0.08)] text-[#B7B7BA] font-mono text-[11px]">
                    <th className="py-2 px-2.5 font-medium">Filename</th>
                    <th className="py-2 px-2.5 font-medium">Timestamp</th>
                    <th className="py-2 px-2.5 font-medium">Detections</th>
                    <th className="py-2 px-2.5 font-medium">Status</th>
                    <th className="py-2 px-2.5 text-right font-medium">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(239,223,197,0.05)]">
                  {recentRecords.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRecord(row)}
                      className="hover:bg-[rgba(48,40,43,0.45)] cursor-pointer transition-colors group"
                      title="Click to view inspection details"
                    >
                      <td className="py-2.5 px-2.5 font-medium text-[#EFDFC5] max-w-[170px] truncate group-hover:text-white transition-colors">
                        <span title={row.filename}>{row.filename}</span>
                      </td>
                      <td className="py-2.5 px-2.5 text-[#B7B7BA] font-mono text-[11px] whitespace-nowrap">
                        {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        <span className="text-[#B7B7BA]/50">
                          {new Date(row.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span
                          className={`font-mono tabular-nums text-[11px] font-semibold px-2 py-0.5 rounded ${
                            row.defect_count > 0
                              ? 'bg-[rgba(143,11,19,0.35)] text-[#EFDFC5] border border-[rgba(220,32,17,0.4)]'
                              : 'bg-[rgba(20,16,18,0.7)] text-emerald-400 border border-emerald-900/40'
                          }`}
                        >
                          {row.defect_count} {row.defect_count === 1 ? 'defect' : 'defects'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        {renderStatusBadge(row.status, row.defect_count)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-[#EFDFC5] tabular-nums whitespace-nowrap">
                        {row.inference_time_ms} ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-10 text-center text-[#B7B7BA] text-xs flex-1 flex flex-col items-center justify-center">
                <p>No inspection records logged yet.</p>
                <button
                  onClick={onStartInspection}
                  className="text-[#DC2011] hover:underline font-medium mt-2 inline-flex items-center gap-1"
                >
                  Run an inspection in Studio
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inspection Detail Modal when clicking any row */}
      {selectedRecord && (
        <InspectionModal
          inspection={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};

export default DashboardView;
