import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Layers,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Download,
  SplitSquareVertical,
  Columns,
  ShieldAlert,
  Crosshair
} from 'lucide-react';
import { InspectionRecord, DefectItem } from '../../types';
import { api } from '../../api/backendClient';
import { SplitSlider } from '../Studio/SplitSlider';
import { ZoomViewer } from '../Studio/ZoomViewer';

interface InspectionModalProps {
  inspection: InspectionRecord | null;
  onClose: () => void;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  inspection,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'zoom'>('split');
  const [fullRecord, setFullRecord] = useState<InspectionRecord | null>(inspection);
  const [selectedItem, setSelectedItem] = useState<DefectItem | null>(null);

  // Fetch full details if defect items are needed
  useEffect(() => {
    if (inspection) {
      setFullRecord(inspection);
      api.getInspection(inspection.id)
        .then((data) => {
          if (data) setFullRecord(data);
        })
        .catch((err) => console.warn('Could not fetch inspection details:', err));
    }
  }, [inspection]);

  if (!fullRecord) return null;

  const origUrl = fullRecord.original_image_path
    ? api.getStorageImageUrl(fullRecord.original_image_path)
    : null;
  const annotUrl = fullRecord.annotated_image_path
    ? api.getStorageImageUrl(fullRecord.annotated_image_path)
    : null;

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="glass-elevated border border-[rgba(239,223,197,0.18)] rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-[rgba(239,223,197,0.12)] flex items-center justify-between bg-[rgba(30,26,28,0.85)] backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-[rgba(20,16,18,0.85)] text-[#EFDFC5] border border-[rgba(239,223,197,0.14)]">
              #{fullRecord.id}
            </span>
            <h2 className="text-sm font-semibold text-[#EFDFC5] truncate max-w-sm">
              {fullRecord.filename}
            </h2>
            {renderStatusBadge(fullRecord.status, fullRecord.defect_count)}
          </div>

          <div className="flex items-center gap-3">
            {origUrl && annotUrl && (
              <div className="flex items-center p-0.5 rounded-lg bg-[rgba(20,16,18,0.85)] border border-[rgba(239,223,197,0.14)] text-xs font-mono">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    viewMode === 'split'
                      ? 'bg-[#380F17] text-[#EFDFC5] font-semibold border border-[#8F0B13]'
                      : 'text-[#B7B7BA] hover:text-[#EFDFC5]'
                  }`}
                >
                  Split
                </button>
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    viewMode === 'side-by-side'
                      ? 'bg-[#380F17] text-[#EFDFC5] font-semibold border border-[#8F0B13]'
                      : 'text-[#B7B7BA] hover:text-[#EFDFC5]'
                  }`}
                >
                  Dual
                </button>
                <button
                  onClick={() => setViewMode('zoom')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    viewMode === 'zoom'
                      ? 'bg-[#380F17] text-[#EFDFC5] font-semibold border border-[#8F0B13]'
                      : 'text-[#B7B7BA] hover:text-[#EFDFC5]'
                  }`}
                >
                  Zoom
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[rgba(48,40,43,0.8)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 min-w-0 min-h-0 flex overflow-hidden">
          {/* Visual Display (Preserve Opaque Background for PCB inspection pixels) */}
          <div className="flex-1 min-w-0 min-h-0 p-4 bg-[#100D0E] flex flex-col justify-center items-center overflow-hidden border-r border-[rgba(239,223,197,0.12)] relative">
            {origUrl && annotUrl ? (
              viewMode === 'split' ? (
                <SplitSlider
                  originalImage={origUrl}
                  annotatedImage={annotUrl}
                  className="w-full h-full min-w-0 min-h-0"
                />
              ) : viewMode === 'side-by-side' ? (
                <div className="w-full h-full min-w-0 min-h-0 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[rgba(239,223,197,0.15)] bg-[#171719] min-w-0 min-h-0 flex items-center justify-center overflow-hidden relative">
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-[#0D0D0F]/90 border border-[rgba(239,223,197,0.15)] text-[10px] font-mono text-[#B7B7BA] select-none pointer-events-none">
                      Original
                    </span>
                    <img src={origUrl} alt="Original" className="max-h-full max-w-full w-auto h-auto object-contain select-none pointer-events-none" />
                  </div>
                  <div className="rounded-xl border border-[rgba(239,223,197,0.15)] bg-[#171719] min-w-0 min-h-0 flex items-center justify-center overflow-hidden relative">
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-[#380F17]/90 border border-[#8F0B13] text-[10px] font-mono text-[#EFDFC5] select-none pointer-events-none">
                      Annotated
                    </span>
                    <img src={annotUrl} alt="Annotated" className="max-h-full max-w-full w-auto h-auto object-contain select-none pointer-events-none" />
                  </div>
                </div>
              ) : (
                <ZoomViewer
                  imageSrc={annotUrl}
                  altText="Annotated"
                  className="w-full h-full border-none"
                  onFocusBox={selectedItem ? selectedItem.bbox : null}
                  naturalWidth={fullRecord.image_width}
                  naturalHeight={fullRecord.image_height}
                />
              )
            ) : annotUrl ? (
              <img src={annotUrl} alt="Annotated" className="max-h-full max-w-full object-contain rounded-xl" />
            ) : (
              <div className="text-xs text-[#B7B7BA] font-mono">Image data not retained.</div>
            )}
          </div>

          {/* Details Drawer / Sidebar: Metadata, Latency, Breakdown, Coordinates */}
          <div className="w-84 p-5 bg-[rgba(22,18,20,0.92)] backdrop-blur-md flex flex-col justify-between overflow-y-auto flex-shrink-0">
            <div className="space-y-4 text-xs font-mono">
              <div className="pb-3 border-b border-[rgba(239,223,197,0.12)]">
                <span className="text-[10px] text-[#B7B7BA] block font-sans">TIMESTAMP</span>
                <span className="text-[#EFDFC5] font-semibold block mt-0.5">
                  {new Date(fullRecord.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Model and Latency */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl glass-subtle">
                  <span className="text-[10px] text-[#B7B7BA] block font-sans">RESOLUTION</span>
                  <span className="text-[#EFDFC5] font-bold">
                    {fullRecord.image_width} × {fullRecord.image_height}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl glass-subtle">
                  <span className="text-[10px] text-[#B7B7BA] block font-sans">INFERENCE TIME</span>
                  <span className="text-[#EFDFC5] font-bold">
                    {fullRecord.inference_time_ms} ms
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl glass-subtle">
                <span className="text-[10px] text-[#B7B7BA] block font-sans">MODEL IDENTITY</span>
                <span className="text-[#EFDFC5] font-bold block truncate mt-0.5">
                  {fullRecord.model_name}
                </span>
                <span className="text-[10px] text-[#B7B7BA] block mt-1">
                  Threshold: Conf {Math.round(fullRecord.confidence_threshold * 100)}% | IoU {Math.round(fullRecord.iou_threshold * 100)}%
                </span>
              </div>

              {/* Class Breakdown */}
              <div className="pt-1">
                <span className="text-xs font-semibold text-[#EFDFC5] block mb-2 font-sans">
                  Defect Anomalies ({fullRecord.defect_count}):
                </span>
                {Object.keys(fullRecord.summary || {}).length > 0 ? (
                  <div className="space-y-1.5">
                    {Object.entries(fullRecord.summary).map(([cls, cnt]) => (
                      <div
                        key={cls}
                        className="flex justify-between items-center px-2.5 py-1.5 rounded-lg glass-subtle"
                      >
                        <span className="text-[#EFDFC5] uppercase text-[11px]">{cls.replace('_', ' ')}</span>
                        <span className="text-[#DC2011] font-bold">{cnt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl glass-subtle text-[#B7B7BA] text-center text-[11px] font-sans">
                    Zero defects detected on this board.
                  </div>
                )}
              </div>

              {/* Defect Item Coordinates (if populated) */}
              {fullRecord.detections && fullRecord.detections.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-[#EFDFC5] block mb-2 font-sans">
                    Bounding Box Coordinates:
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {fullRecord.detections.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => setSelectedItem(d)}
                        className={`p-2 rounded-lg border cursor-pointer transition-colors text-[10px] ${
                          selectedItem?.id === d.id
                            ? 'bg-[#380F17] border-[#8F0B13] text-[#EFDFC5]'
                            : 'glass-subtle hover:bg-[rgba(48,40,43,0.6)] text-[#B7B7BA]'
                        }`}
                      >
                        <div className="flex justify-between font-semibold text-[#EFDFC5]">
                          <span>#{d.id} {d.class_name.toUpperCase()}</span>
                          <span>{Math.round(d.confidence * 100)}%</span>
                        </div>
                        <div className="text-[10px] text-[#B7B7BA] mt-0.5">
                          BBOX: [{d.bbox.join(', ')}]
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[rgba(239,223,197,0.12)]">
              <button
                onClick={onClose}
                className="w-full py-2 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.9)] text-[#EFDFC5] text-xs font-medium border border-[rgba(239,223,197,0.15)] hover:border-[rgba(220,32,17,0.4)] transition-all shadow-sm"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionModal;
