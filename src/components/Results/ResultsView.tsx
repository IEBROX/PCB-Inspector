import React, { useState, useMemo } from 'react';
import {
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Crosshair,
  Layers,
  Clock,
  Cpu,
  FileSpreadsheet,
  ArrowUpDown,
  Filter,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { DetectionResult, DefectItem } from '../../types';
import { ZoomViewer } from '../Studio/ZoomViewer';
import { api } from '../../api/backendClient';

interface ResultsViewProps {
  result: DetectionResult | null;
  onNavigateToStudio: () => void;
}

type SortField = 'id' | 'class_name' | 'confidence';
type SortOrder = 'asc' | 'desc';

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  onNavigateToStudio,
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // If no active inspection result, show compact informative empty state
  if (!result) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 pb-24 text-center bg-transparent relative">
        <div className="p-6 rounded-2xl glass-elevated border border-[rgba(239,223,197,0.18)] max-w-sm flex flex-col items-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-[rgba(38,34,36,0.8)] border border-[rgba(239,223,197,0.15)] flex items-center justify-center text-[#DC2011] mb-3 shadow-inner">
            <ListFilter className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-[#EFDFC5] mb-1">No Inspection Results Active</h2>
          <p className="text-xs text-[#B7B7BA] mb-4 leading-relaxed">
            Run an optical inspection in Inspection Studio to review detected defect classes, coordinates, and bounding boxes.
          </p>
          <button
            onClick={onNavigateToStudio}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8F0B13] hover:bg-[#DC2011] text-[#EFDFC5] font-semibold text-xs transition-colors border border-[#8F0B13] shadow-sm"
          >
            Open Inspection Studio
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Calculate summary metrics
  const distinctClasses = useMemo(() => {
    return Array.from(new Set(result.detections.map((d) => d.class_name)));
  }, [result.detections]);

  // Filter and sort detections
  const processedDetections = useMemo(() => {
    let list = result.detections.filter((d) => {
      const classMatch = selectedClass === 'all' || d.class_name === selectedClass;
      const confMatch = d.confidence >= minConfidence;
      return classMatch && confMatch;
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') {
        comparison = a.id - b.id;
      } else if (sortField === 'confidence') {
        comparison = a.confidence - b.confidence;
      } else if (sortField === 'class_name') {
        comparison = a.class_name.localeCompare(b.class_name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [result.detections, selectedClass, minConfidence, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
      {/* Top Header Toolbar */}
      <div className="h-12 border-b border-[rgba(239,223,197,0.12)] bg-[rgba(24,20,22,0.85)] backdrop-blur-md px-5 flex items-center justify-between gap-4 flex-shrink-0 select-none shadow-sm">
        <div className="flex items-center gap-3">
          <ListFilter className="w-4 h-4 text-[#DC2011]" />
          <h1 className="font-semibold text-xs text-[#EFDFC5] tracking-wide uppercase font-mono">
            Results & Bounding Boxes
          </h1>
          <span className="text-[11px] text-[#B7B7BA] font-mono hidden sm:inline">
            Source: <strong className="text-[#EFDFC5] font-normal">{result.filename}</strong> ({result.image_width}×{result.image_height} px)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] border border-[rgba(239,223,197,0.15)] hover:border-[rgba(220,32,17,0.45)] text-xs font-mono transition-all shadow-sm"
            title="Download CSV Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#DC2011]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="flex-1 min-w-0 min-h-0 flex overflow-hidden pb-20">
        {/* Left Side: Interactive Annotated PCB Map with Zoom Viewer */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-4 overflow-hidden border-r border-[rgba(239,223,197,0.12)]">
          {/* Viewer Toolbar */}
          <div className="flex items-center justify-between pb-2 text-xs font-mono text-[#B7B7BA] flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#DC2011]" />
              Defect Coordinate Map
            </span>
            {selectedDefect ? (
              <span className="text-[#DC2011] font-semibold flex items-center gap-1">
                Targeting: #{selectedDefect.id} {selectedDefect.class_name.replace('_', ' ').toUpperCase()} ({Math.round(selectedDefect.confidence * 100)}%)
              </span>
            ) : (
              <span className="text-[11px] text-[#B7B7BA]">
                Click table row to focus defect bounding box
              </span>
            )}
          </div>

          {/* Central Zoom & Pan Viewer (Preserve Opaque Background for PCB inspection pixels) */}
          <div className="flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden border border-[rgba(239,223,197,0.15)] bg-[#100D0E] relative shadow-2xl">
            <ZoomViewer
              imageSrc={result.annotated_image_base64}
              altText="Annotated PCB Defect Map"
              className="w-full h-full border-none"
              onFocusBox={selectedDefect ? selectedDefect.bbox : null}
              naturalWidth={result.image_width}
              naturalHeight={result.image_height}
            />
          </div>

          {/* Compact Summary Metrics Cards at the bottom */}
          <div className="mt-3 grid grid-cols-4 gap-3 text-xs flex-shrink-0">
            <div className="p-2.5 rounded-xl glass-panel flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-[#B7B7BA] font-mono">TOTAL DETECTIONS</span>
              <span className="text-base font-bold text-[#DC2011] font-mono mt-0.5">
                {result.defect_count}
              </span>
            </div>

            <div className="p-2.5 rounded-xl glass-panel flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-[#B7B7BA] font-mono">DISTINCT CLASSES</span>
              <span className="text-base font-bold text-[#EFDFC5] font-mono mt-0.5">
                {distinctClasses.length}
              </span>
            </div>

            <div className="p-2.5 rounded-xl glass-panel flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-[#B7B7BA] font-mono">INFERENCE LATENCY</span>
              <span className="text-base font-bold text-[#EFDFC5] font-mono mt-0.5">
                {result.inference_time_ms} ms
              </span>
            </div>

            <div className="p-2.5 rounded-xl glass-panel flex flex-col justify-between shadow-sm">
              <span className="text-[10px] text-[#B7B7BA] font-mono">VERIFICATION STATUS</span>
              <span className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${
                result.defect_count > 0
                  ? 'text-[#DC2011]'
                  : result.status === 'Unverified'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {result.defect_count > 0 ? (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    Review Required
                  </>
                ) : result.status === 'Unverified' ? (
                  <>
                    <ShieldAlert className="w-3 h-3" />
                    Unverified
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Detection Table & Filters */}
        <div className="w-[440px] flex flex-col bg-[rgba(22,18,20,0.88)] backdrop-blur-md border-l border-[rgba(239,223,197,0.12)] overflow-hidden flex-shrink-0">
          {/* Filter Bar */}
          <div className="p-3.5 border-b border-[rgba(239,223,197,0.12)] space-y-2.5 bg-[rgba(30,26,28,0.6)]">
            <div className="flex items-center justify-between text-xs font-mono text-[#EFDFC5]">
              <span className="flex items-center gap-1.5 font-semibold">
                <Filter className="w-3.5 h-3.5 text-[#DC2011]" />
                Filter Defect Proposals
              </span>
              <span className="text-[#B7B7BA] text-[11px]">
                {processedDetections.length} of {result.defect_count} shown
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Filter detections by class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-[rgba(20,16,18,0.85)] border border-[rgba(239,223,197,0.14)] text-[#EFDFC5] text-xs rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:border-[#DC2011] transition-colors"
              >
                <option value="all">All Classes ({result.detections.length})</option>
                {distinctClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls.replace('_', ' ')} ({result.defect_summary[cls] || 0})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(20,16,18,0.85)] border border-[rgba(239,223,197,0.14)]">
                <span className="text-[10px] text-[#B7B7BA] font-mono whitespace-nowrap">Min:</span>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.05"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[rgba(48,40,43,0.8)] rounded appearance-none cursor-pointer accent-[#DC2011]"
                />
                <span className="text-[11px] font-mono text-[#EFDFC5] w-7 text-right">
                  {Math.round(minConfidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Defect Bounding Boxes Table */}
          <div className="flex-1 overflow-y-auto">
            {processedDetections.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[rgba(30,26,28,0.95)] backdrop-blur-sm border-b border-[rgba(239,223,197,0.12)] text-[#B7B7BA] font-mono text-[11px] z-10">
                  <tr>
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:text-[#EFDFC5] transition-colors"
                      onClick={() => toggleSort('id')}
                    >
                      <div className="flex items-center gap-1">
                        ID
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:text-[#EFDFC5] transition-colors"
                      onClick={() => toggleSort('class_name')}
                    >
                      <div className="flex items-center gap-1">
                        Class
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 cursor-pointer hover:text-[#EFDFC5] transition-colors"
                      onClick={() => toggleSort('confidence')}
                    >
                      <div className="flex items-center gap-1">
                        Confidence
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-right">Coordinates [x1, y1, x2, y2]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(239,223,197,0.06)]">
                  {processedDetections.map((defect) => {
                    const isSelected = selectedDefect?.id === defect.id;
                    const [x1, y1, x2, y2] = defect.bbox;

                    return (
                      <tr
                        key={defect.id}
                        onClick={() => setSelectedDefect(isSelected ? null : defect)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#380F17]/90 text-[#EFDFC5]'
                            : 'hover:bg-[rgba(48,40,43,0.4)] text-[#B7B7BA]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-[#EFDFC5]">
                          #{defect.id}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#EFDFC5] uppercase text-[11px]">
                          {defect.class_name.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                              isSelected
                                ? 'bg-[#8F0B13] text-[#EFDFC5]'
                                : 'bg-[rgba(20,16,18,0.85)] text-[#EFDFC5] border border-[rgba(239,223,197,0.14)]'
                            }`}
                          >
                            {Math.round(defect.confidence * 100)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[10px] text-[#B7B7BA]">
                          [{Math.round(x1)}, {Math.round(y1)}, {Math.round(x2)}, {Math.round(y2)}]
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[#B7B7BA] text-xs">
                {result.defect_count === 0 ? (
                  <div className="space-y-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-[#EFDFC5]">Zero Defects Detected</p>
                    <p className="text-[11px]">Board traces conform to expected topology.</p>
                  </div>
                ) : (
                  'No detections match current filter parameters.'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
