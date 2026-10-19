import React from 'react';
import {
  LayoutDashboard,
  ScanLine,
  ListChecks,
  Cpu,
  History,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
  Upload,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { DetectionResult, ModelStatus, InspectionStats, InspectionRecord } from '../../types';

export type NavTab = 'dashboard' | 'studio' | 'results' | 'model' | 'history';

interface NavPreviewCardProps {
  tab: NavTab;
  onNavigate: () => void;
  stats: InspectionStats | null;
  recentRecords: InspectionRecord[];
  modelStatus: ModelStatus | null;
  activeResult: DetectionResult | null;
  selectedImageName?: string | null;
}

export const NavPreviewCard: React.FC<NavPreviewCardProps> = ({
  tab,
  onNavigate,
  stats,
  recentRecords,
  modelStatus,
  activeResult,
  selectedImageName,
}) => {
  // Common tab meta configurations
  const meta: Record<
    NavTab,
    { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    dashboard: {
      title: 'Inspection Dashboard',
      subtitle: 'Defect distribution, verification pass rates & system metrics',
      icon: LayoutDashboard,
    },
    studio: {
      title: 'Inspection Studio',
      subtitle: 'High-resolution optical scanner & YOLO neural inference',
      icon: ScanLine,
    },
    results: {
      title: 'Results & Bounding Boxes',
      subtitle: 'Defect localization overlays, bounding boxes & confidence logs',
      icon: ListChecks,
    },
    model: {
      title: 'Model Manager',
      subtitle: 'Neural weights status, inference device & detection thresholds',
      icon: Cpu,
    },
    history: {
      title: 'History & Reports',
      subtitle: 'Historical inspection log, defect audit trails & data export',
      icon: History,
    },
  };

  const currentMeta = meta[tab];
  const Icon = currentMeta.icon;

  // Render specific layout preview based on destination
  const renderContent = () => {
    switch (tab) {
      case 'dashboard': {
        const total = stats?.total_inspections ?? 0;
        const validDefects = stats?.total_defects_valid ?? stats?.total_defects_found ?? 0;
        const validInspections = stats?.valid_inspections ?? total;
        const passRate = total > 0 ? Math.round((validInspections / total) * 100) : 0;
        const classBreakdown = stats?.defects_by_class || {};

        return (
          <div className="space-y-3">
            {/* Top Stat Pills Row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-[rgba(36,33,34,0.7)] border border-[rgba(239,223,197,0.1)] text-center">
                <span className="block text-[10px] text-[#B7B7BA] font-sans">Inspections</span>
                <span className="text-sm font-bold text-[#EFDFC5] font-mono">{total}</span>
              </div>
              <div className="p-2 rounded-lg bg-[rgba(36,33,34,0.7)] border border-[rgba(239,223,197,0.1)] text-center">
                <span className="block text-[10px] text-[#B7B7BA] font-sans">Valid Defects</span>
                <span className="text-sm font-bold text-[#DC2011] font-mono">{validDefects}</span>
              </div>
              <div className="p-2 rounded-lg bg-[rgba(36,33,34,0.7)] border border-[rgba(239,223,197,0.1)] text-center">
                <span className="block text-[10px] text-[#B7B7BA] font-sans">Verification</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{passRate}%</span>
              </div>
            </div>

            {/* Defect Summary Mini Breakdown */}
            <div className="p-2.5 rounded-lg bg-[rgba(36,33,34,0.5)] border border-[rgba(239,223,197,0.08)] space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#B7B7BA] font-medium">Defect Class Breakdown</span>
                <span className="text-[10px] font-mono text-[#EFDFC5]">6 PCB Classes</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                {['missing_hole', 'mouse_bite', 'open_circuit', 'short', 'spur', 'spurious_copper'].map((cls) => {
                  const count = classBreakdown[cls] || 0;
                  const label = cls.replace('_', ' ');
                  return (
                    <div
                      key={cls}
                      className="px-1.5 py-1 rounded bg-[rgba(24,20,22,0.6)] border border-[rgba(239,223,197,0.06)] flex items-center justify-between truncate"
                      title={`${label}: ${count}`}
                    >
                      <span className="text-[#B7B7BA] capitalize truncate">{label.split(' ')[0]}</span>
                      <span className={`ml-1 font-semibold ${count > 0 ? 'text-[#DC2011]' : 'text-[#8A878B]'}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Model Readiness Indicator */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[rgba(56,15,23,0.35)] border border-[rgba(143,11,19,0.4)] text-[11px]">
              <span className="flex items-center gap-1.5 text-[#EFDFC5]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Model Readiness</span>
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {modelStatus?.loaded ? 'pcb_best.pt • Active' : 'Offline'}
              </span>
            </div>
          </div>
        );
      }

      case 'studio': {
        const hasActive = !!activeResult;
        return (
          <div className="space-y-3">
            {/* Image Preview & Upload Region */}
            <div className="h-28 rounded-lg bg-[rgba(18,15,16,0.85)] border border-[rgba(239,223,197,0.12)] p-2 flex items-center justify-center relative overflow-hidden">
              {hasActive && (activeResult.original_image_base64 || activeResult.annotated_image_base64) ? (
                <div className="w-full h-full flex items-center gap-3">
                  <div className="w-24 h-full rounded bg-black/40 border border-[rgba(239,223,197,0.1)] overflow-hidden flex items-center justify-center flex-shrink-0">
                    <img
                      src={activeResult.annotated_image_base64 || activeResult.original_image_base64}
                      alt="PCB Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1 text-left">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-[#EFDFC5] truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      <span className="truncate" title={activeResult.filename}>{activeResult.filename}</span>
                    </div>
                    <span className="text-[10px] text-[#B7B7BA] font-mono">
                      {activeResult.image_width} × {activeResult.image_height} px
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#380F17] text-[#DC2011] border border-[#8F0B13]/60 w-fit">
                      {activeResult.defect_count} Defects Found
                    </span>
                  </div>
                </div>
              ) : selectedImageName ? (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#EFDFC5] truncate max-w-[240px]">
                    {selectedImageName}
                  </span>
                  <span className="text-[10px] text-emerald-400 mt-0.5">
                    Loaded & Ready for Optical Scan
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-2">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(56,15,23,0.5)] border border-[rgba(143,11,19,0.5)] flex items-center justify-center text-[#DC2011] mb-1.5">
                    <Upload className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-[#EFDFC5]">Inspection Canvas Ready</span>
                  <span className="text-[10px] text-[#B7B7BA] mt-0.5">
                    Drag & drop PCB image or load pre-trained sample
                  </span>
                </div>
              )}
            </div>

            {/* Detection Controls & Status Summary */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="px-2.5 py-1.5 rounded-lg bg-[rgba(36,33,34,0.6)] border border-[rgba(239,223,197,0.08)] flex items-center justify-between">
                <span className="text-[#B7B7BA]">Confidence</span>
                <span className="font-mono text-[#EFDFC5] font-semibold">
                  {Math.round((modelStatus?.conf_threshold ?? 0.25) * 100)}%
                </span>
              </div>
              <div className="px-2.5 py-1.5 rounded-lg bg-[rgba(36,33,34,0.6)] border border-[rgba(239,223,197,0.08)] flex items-center justify-between">
                <span className="text-[#B7B7BA]">IoU NMS</span>
                <span className="font-mono text-[#EFDFC5] font-semibold">
                  {Math.round((modelStatus?.iou_threshold ?? 0.45) * 100)}%
                </span>
              </div>
            </div>
          </div>
        );
      }

      case 'results': {
        const hasResult = !!activeResult;
        return (
          <div className="space-y-3">
            {hasResult ? (
              <>
                {/* Result Summary Bar */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[rgba(36,33,34,0.7)] border border-[rgba(239,223,197,0.1)] text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-[#EFDFC5]">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#DC2011]" />
                    <span>{activeResult.defect_count} Defects Detected</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#B7B7BA]">
                    {activeResult.inference_time_ms} ms
                  </span>
                </div>

                {/* Bounding Box Image Preview Region */}
                <div className="h-28 rounded-lg bg-black/60 border border-[rgba(239,223,197,0.12)] p-1.5 flex items-center justify-center overflow-hidden relative">
                  {activeResult.annotated_image_base64 ? (
                    <img
                      src={activeResult.annotated_image_base64}
                      alt="Annotated Bounding Boxes"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-xs text-[#B7B7BA]">No image annotation</span>
                  )}
                </div>

                {/* Detected Labels List Chips */}
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                  {activeResult.detections && activeResult.detections.length > 0 ? (
                    activeResult.detections.slice(0, 5).map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[rgba(56,15,23,0.6)] border border-[#8F0B13]/70 text-[#EFDFC5]"
                      >
                        <span className="text-[#DC2011] capitalize">{d.class_name.replace('_', ' ')}</span>
                        <span className="text-[#B7B7BA]">{Math.round(d.confidence * 100)}%</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-sans">
                      Clean board: No defects flagged
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 rounded-lg bg-[rgba(36,33,34,0.5)] border border-[rgba(239,223,197,0.08)] text-center space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-[rgba(56,15,23,0.4)] border border-[rgba(143,11,19,0.4)] flex items-center justify-center text-[#DC2011] mx-auto mb-1">
                  <ListChecks className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-[#EFDFC5]">No Active Inspection Result</h4>
                <p className="text-[11px] text-[#B7B7BA] leading-relaxed">
                  Run an optical scan in Studio to view bounding boxes, defect labels, and confidence ratings.
                </p>
              </div>
            )}
          </div>
        );
      }

      case 'model': {
        const isLoaded = modelStatus?.loaded;
        const modelName = modelStatus?.model_info?.name || 'pcb_best.pt';
        const device = (modelStatus?.device || 'CPU').toUpperCase();

        return (
          <div className="space-y-3">
            {/* Active Model Header Card */}
            <div className="p-2.5 rounded-lg bg-[rgba(36,33,34,0.7)] border border-[rgba(239,223,197,0.1)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                  <span className="font-mono text-xs font-bold text-[#EFDFC5]">{modelName}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  {isLoaded ? 'Verified Ready' : 'Unloaded'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-[rgba(239,223,197,0.08)]">
                <span className="text-[#B7B7BA]">Inference Device: <strong className="text-[#EFDFC5]">{device}</strong></span>
                <span className="text-[#B7B7BA]">Classes: <strong className="text-[#EFDFC5]">6 PCB Types</strong></span>
              </div>
            </div>

            {/* Model Calibration Summary */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-[rgba(36,33,34,0.5)] border border-[rgba(239,223,197,0.08)] flex flex-col">
                <span className="text-[10px] text-[#B7B7BA]">Confidence Threshold</span>
                <span className="text-xs font-mono font-bold text-[#EFDFC5] mt-0.5">
                  {Math.round((modelStatus?.conf_threshold ?? 0.25) * 100)}%
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[rgba(36,33,34,0.5)] border border-[rgba(239,223,197,0.08)] flex flex-col">
                <span className="text-[10px] text-[#B7B7BA]">IoU NMS Threshold</span>
                <span className="text-xs font-mono font-bold text-[#EFDFC5] mt-0.5">
                  {Math.round((modelStatus?.iou_threshold ?? 0.45) * 100)}%
                </span>
              </div>
            </div>

            <div className="text-[10px] font-mono text-[#B7B7BA] px-1 flex items-center justify-between">
              <span>Weights: PyTorch YOLOv8</span>
              <span>Size: 20.4 MB</span>
            </div>
          </div>
        );
      }

      case 'history': {
        const records = recentRecords.slice(0, 3);
        const hasRecords = records.length > 0;

        return (
          <div className="space-y-3">
            {/* Recent Inspection Log Mini Table */}
            {hasRecords ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#B7B7BA] px-1">
                  <span>Recent Inspections</span>
                  <span>Defect Status</span>
                </div>
                {records.map((r) => {
                  const dateStr = r.timestamp ? r.timestamp.split('T')[0] : 'Recent';
                  const isClean = r.defect_count === 0;

                  return (
                    <div
                      key={r.id}
                      className="px-2.5 py-1.5 rounded-lg bg-[rgba(36,33,34,0.6)] border border-[rgba(239,223,197,0.08)] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[11px] text-[#EFDFC5] block truncate max-w-[170px]" title={r.filename}>
                          {r.filename}
                        </span>
                        <span className="text-[10px] text-[#B7B7BA] font-mono block">
                          {dateStr} • #{r.id}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                          isClean
                            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50'
                            : 'text-[#DC2011] bg-[#380F17] border border-[#8F0B13]/70'
                        }`}
                      >
                        {isClean ? 'Passed' : `${r.defect_count} Defects`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-[rgba(36,33,34,0.5)] border border-[rgba(239,223,197,0.08)] text-center">
                <span className="text-xs text-[#B7B7BA]">No previous inspections in SQLite database.</span>
              </div>
            )}

            {/* Export Telemetry Indicator */}
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[rgba(36,33,34,0.4)] border border-[rgba(239,223,197,0.06)] text-[10px] font-mono text-[#B7B7BA]">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#DC2011]" />
                <span>Audit Exports: CSV & JSON</span>
              </span>
              <span className="text-[#EFDFC5]">Ready</span>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div
      onClick={onNavigate}
      role="region"
      aria-label={`${currentMeta.title} Preview`}
      className="w-[360px] sm:w-[380px] bg-[#181516]/95 backdrop-blur-xl border border-[rgba(239,223,197,0.16)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-4 text-[#EFDFC5] select-none cursor-pointer group transition-all duration-150 hover:border-[rgba(220,32,17,0.4)]"
    >
      {/* Card Header: Icon, Page Name, Short Description & Open Pill */}
      <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[rgba(239,223,197,0.1)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[rgba(56,15,23,0.7)] border border-[rgba(143,11,19,0.7)] flex items-center justify-center text-[#DC2011] flex-shrink-0 shadow-[0_0_10px_rgba(220,32,17,0.25)]">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-[#EFDFC5] truncate tracking-wide">
              {currentMeta.title}
            </h3>
            <p className="text-[11px] text-[#B7B7BA] truncate leading-tight mt-0.5">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(36,33,34,0.8)] border border-[rgba(239,223,197,0.12)] text-[10px] font-mono text-[#DC2011] group-hover:text-[#EFDFC5] group-hover:bg-[#8F0B13] group-hover:border-[#DC2011] transition-all flex-shrink-0">
          <span>Open</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Main Dynamic Lightweight Content Preview */}
      <div className="py-1">
        {renderContent()}
      </div>

      {/* Interactive Bottom Footer */}
      <div className="mt-3 pt-2.5 border-t border-[rgba(239,223,197,0.08)] flex items-center justify-between text-[11px] text-[#B7B7BA]">
        <span className="flex items-center gap-1.5 font-sans">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Click to open {currentMeta.title.split(' ')[0]}</span>
        </span>
        <span className="font-mono text-xs text-[#DC2011] group-hover:text-[#EFDFC5] flex items-center gap-1 transition-colors">
          <span>Enter View</span>
          <span>→</span>
        </span>
      </div>
    </div>
  );
};
