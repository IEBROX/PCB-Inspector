import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Play,
  Layers,
  RotateCcw,
  Sliders,
  AlertCircle,
  FileImage,
  RefreshCw,
  Eye,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  X,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { DetectionResult, ModelStatus, SampleImage } from '../../types';
import { api } from '../../api/backendClient';

interface StudioViewProps {
  modelStatus: ModelStatus | null;
  onDetectionComplete: (result: DetectionResult) => void;
  onClearActiveResult: () => void;
  onImageSelected?: (filename: string | null) => void;
  onNavigateToResults: () => void;
  onNavigateToModel: () => void;
  activeResult: DetectionResult | null;
}

export const StudioView: React.FC<StudioViewProps> = ({
  modelStatus,
  onDetectionComplete,
  onClearActiveResult,
  onImageSelected,
  onNavigateToResults,
  onNavigateToModel,
  activeResult,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confThreshold, setConfThreshold] = useState<number>(
    modelStatus?.conf_threshold ?? 0.25
  );
  const [iouThreshold, setIouThreshold] = useState<number>(
    modelStatus?.iou_threshold ?? 0.45
  );
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [samples, setSamples] = useState<SampleImage[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const detectionReqIdRef = useRef<number>(0);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Sync thresholds with model status
  useEffect(() => {
    if (modelStatus) {
      setConfThreshold(modelStatus.conf_threshold);
      setIouThreshold(modelStatus.iou_threshold);
    }
  }, [modelStatus]);

  // Load samples
  useEffect(() => {
    const loadSamples = async () => {
      const s = await api.getSamples();
      setSamples(s);
    };
    loadSamples();
  }, []);

  // When active result is passed from previous run and no new file has been picked
  useEffect(() => {
    if (activeResult && !selectedFile && !previewUrl) {
      setPreviewUrl(activeResult.original_image_base64);
      setFilename(activeResult.filename);
      setImageDimensions({ width: activeResult.image_width, height: activeResult.image_height });
      onImageSelected?.(activeResult.filename);
    }
  }, [activeResult, selectedFile, previewUrl, onImageSelected]);

  // Handle file selection immediately with zero latency and clean state reset
  const handleSelectFile = (file: File) => {
    if (!file) return;

    // Validate image MIME type and file extension
    const validExtensions = /\.(jpe?g|png|bmp|webp)$/i;
    const isImage = file.type ? file.type.startsWith('image/') : validExtensions.test(file.name);
    if (!isImage) {
      setErrorMsg(`Unsupported file type: "${file.name}". Please select a valid PCB image (.jpg, .png, .bmp, .webp).`);
      return;
    }

    if (file.size === 0) {
      setErrorMsg(`Selected image "${file.name}" is empty (0 bytes).`);
      return;
    }

    // 1. Clear previous error and stale detection state immediately
    setErrorMsg(null);
    onClearActiveResult();

    // 2. Set current file and filename
    setSelectedFile(file);
    setFilename(file.name);
    onImageSelected?.(file.name);

    // 3. Create instant, high-performance object URL for local preview
    if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const newObjectUrl = URL.createObjectURL(file);
    objectUrlRef.current = newObjectUrl;
    setPreviewUrl(newObjectUrl);

    // 4. Determine natural image dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setErrorMsg(`Failed to render preview for "${file.name}". File might be corrupted.`);
    };
    img.src = newObjectUrl;
  };

  // Reset workspace
  const handleReset = () => {
    if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFilename('');
    setErrorMsg(null);
    setImageDimensions(null);
    onClearActiveResult();
    onImageSelected?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Electron native file dialog or HTML input fallback with zero CORS issues
  const handleBrowseFiles = async () => {
    if (window.electronAPI?.openImageDialog) {
      try {
        const res = await window.electronAPI.openImageDialog({
          title: 'Select PCB Inspection Image',
          filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'webp'] },
          ],
        });
        if (res && res.base64) {
          const binaryStr = atob(res.base64);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: res.mimeType });
          const file = new File([blob], res.filename, { type: res.mimeType });
          handleSelectFile(file);
          return;
        }
        // User cancelled native dialog
        return;
      } catch (err) {
        console.warn('Native openImageDialog error, falling back to input:', err);
      }
    }

    // Web browser fallback or fallback input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleSelectFile(file);
    }
  };

  // Handle selecting a pre-loaded sample
  const handleSelectSample = async (sampleFilename: string) => {
    if (!sampleFilename) return;
    try {
      setErrorMsg(null);
      const url = api.getSampleImageUrl(sampleFilename);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], sampleFilename, { type: blob.type || 'image/jpeg' });
      handleSelectFile(file);
    } catch (e: any) {
      setErrorMsg(`Failed to load sample image: ${e.message}`);
    }
  };

  // Run Real YOLO Detection
  const handleRunDetection = async () => {
    if (!selectedFile && !previewUrl) {
      setErrorMsg('Please select or upload a PCB image first.');
      return;
    }

    if (!modelStatus?.loaded) {
      setErrorMsg(
        'No trained PCB model loaded. Please train your model in Google Colab and select your .pt checkpoint in Model Manager.'
      );
      return;
    }

    if (isDetecting) return; // Prevent concurrent submissions

    const reqId = ++detectionReqIdRef.current;
    const targetName = filename || 'pcb_image.jpg';

    try {
      setIsDetecting(true);
      setErrorMsg(null);

      let targetBlob: Blob | File | null = selectedFile;
      if (!targetBlob && previewUrl) {
        const res = await fetch(previewUrl);
        targetBlob = await res.blob();
      }

      if (!targetBlob) {
        throw new Error('Image source not available.');
      }

      const result = await api.detect(
        targetBlob,
        targetName,
        confThreshold,
        iouThreshold
      );

      // Guard against race conditions: verify this request is still the active one
      if (reqId !== detectionReqIdRef.current) {
        return;
      }

      onDetectionComplete(result);
    } catch (e: any) {
      if (reqId === detectionReqIdRef.current) {
        setErrorMsg(e.message || 'Error occurred during YOLO model inference.');
      }
    } finally {
      if (reqId === detectionReqIdRef.current) {
        setIsDetecting(false);
      }
    }
  };

  const isCurrentResult = !!(activeResult && activeResult.filename === filename);

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-transparent relative">
      {/* Hidden native input fallback with value-clearing on click */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/bmp,image/webp"
        onClick={(e) => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleSelectFile(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Top Compact Studio Toolbar */}
      <div className="min-h-12 border-b border-[rgba(239,223,197,0.12)] bg-[rgba(24,20,22,0.85)] backdrop-blur-md px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 select-none flex-shrink-0 shadow-sm">
        {/* Left: Studio Title & Loaded File Pill */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#DC2011]" />
            <h1 className="font-semibold text-xs text-[#EFDFC5] tracking-wide uppercase font-mono">
              Inspection Studio
            </h1>
          </div>

          {filename ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[rgba(38,34,36,0.65)] border border-[rgba(239,223,197,0.13)] text-[11px] font-mono text-[#EFDFC5]">
              <FileImage className="w-3 h-3 text-[#DC2011]" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]" title={filename}>{filename}</span>
            </div>
          ) : (
            <span className="text-[11px] text-[#B7B7BA] font-sans">
              No image loaded
            </span>
          )}
        </div>

        {/* Right Toolbar Actions: Upload, Reset, Settings, Run Detection */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {/* Sample Selector Dropdown */}
          {samples.length > 0 && (
            <div className="relative">
              <select
                aria-label="Select sample PCB image"
                onChange={(e) => {
                  handleSelectSample(e.target.value);
                  e.target.value = '';
                }}
                defaultValue=""
                className="bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] text-xs rounded-lg px-2.5 py-1.5 border border-[rgba(239,223,197,0.15)] focus:outline-none cursor-pointer font-sans transition-colors"
              >
                <option value="" disabled>Load Sample...</option>
                {samples.map((s) => (
                  <option key={s.filename} value={s.filename}>
                    {s.filename} ({s.defect_hint.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleBrowseFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] border border-[rgba(239,223,197,0.15)] hover:border-[rgba(220,32,17,0.45)] text-xs font-medium transition-all shadow-sm"
            title="Upload local PCB image"
          >
            <Upload className="w-3.5 h-3.5 text-[#DC2011]" />
            Upload Image
          </button>

          {/* Reset Workspace Button */}
          {(previewUrl || selectedFile) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(38,34,36,0.6)] hover:bg-[rgba(48,40,43,0.8)] text-[#B7B7BA] hover:text-[#EFDFC5] border border-[rgba(239,223,197,0.13)] text-xs transition-colors"
              title="Reset Workspace"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          {/* Collapsible Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
              showSettings
                ? 'bg-[#380F17]/90 text-[#EFDFC5] border-[#8F0B13] shadow-[0_0_10px_rgba(220,32,17,0.2)]'
                : 'bg-[rgba(38,34,36,0.7)] text-[#B7B7BA] hover:text-[#EFDFC5] border-[rgba(239,223,197,0.13)] hover:border-[rgba(220,32,17,0.4)]'
            }`}
            title="Calibrate Detection Thresholds"
          >
            <Sliders className="w-3.5 h-3.5 text-[#DC2011]" />
            <span>Settings</span>
          </button>

          {/* Run Detection Primary Action */}
          <button
            onClick={handleRunDetection}
            disabled={(!selectedFile && !previewUrl) || isDetecting || !modelStatus?.loaded}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-xs tracking-wide transition-all ${
              (!selectedFile && !previewUrl) || isDetecting || !modelStatus?.loaded
                ? 'bg-[rgba(38,34,36,0.6)] text-[#B7B7BA]/50 cursor-not-allowed border border-[rgba(239,223,197,0.1)]'
                : 'bg-[#8F0B13] text-[#EFDFC5] hover:bg-[#DC2011] cursor-pointer border border-[#8F0B13] shadow-[0_0_12px_rgba(220,32,17,0.35)]'
            }`}
          >
            {isDetecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#EFDFC5]" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-[#EFDFC5]" />
                Run Detection
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 min-w-0 min-h-0 flex overflow-hidden relative">
        {/* Central Visual Stage */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col p-4 pb-20 overflow-hidden relative bg-transparent">
          {/* Missing Model Banner */}
          {!modelStatus?.loaded && (
            <div className="mb-3 p-3 rounded-xl bg-[rgba(56,15,23,0.75)] backdrop-blur-md border border-[rgba(143,11,19,0.5)] flex items-center justify-between text-xs text-[#EFDFC5] flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#DC2011]" />
                <span>
                  <strong>No trained PCB model loaded:</strong> Optical detection is paused. Train your YOLO model on your PCB dataset in Google Colab, then select your trained <code className="px-1 py-0.5 rounded bg-[#0D0D0F] border border-[rgba(239,223,197,0.15)] text-[#EFDFC5]">.pt</code> checkpoint in Model Manager.
                </span>
              </div>
              <button
                onClick={onNavigateToModel}
                className="px-3 py-1 rounded-lg bg-[#8F0B13] hover:bg-[#DC2011] text-[#EFDFC5] font-semibold text-xs transition-colors whitespace-nowrap ml-3 border border-[#8F0B13]"
              >
                Model Manager
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-3 p-3 rounded-xl bg-[rgba(56,15,23,0.85)] backdrop-blur-md border border-[#DC2011] text-xs text-[#EFDFC5] flex items-center justify-between flex-shrink-0 shadow-sm">
              <span>{errorMsg}</span>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-[#B7B7BA] hover:text-[#EFDFC5] font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Central Image Canvas Container */}
          <div
            className={`flex-1 min-w-0 min-h-0 w-full rounded-xl border border-[rgba(239,223,197,0.15)] bg-[#100D0E] flex items-center justify-center relative overflow-hidden shadow-2xl ${
              isDraggingOver ? 'border-[#DC2011] bg-[#100D0E]' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
          >
            {/* Inference Scanning Overlay */}
            {isDetecting && (
              <div className="absolute inset-0 bg-[#0D0D0F]/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-[#DC2011] border-t-transparent animate-spin flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-[#8F0B13]/50 animate-pulse" />
                </div>
                <div className="text-center font-mono">
                  <span className="text-sm font-semibold text-[#EFDFC5] tracking-wider block">
                    Processing Optical Scan...
                  </span>
                  <span className="text-xs text-[#B7B7BA] mt-1 block font-sans">
                    Running YOLO neural inference on PCB trace topology
                  </span>
                </div>
              </div>
            )}

            {/* Canvas View Content: Separates raw image selection from detection results */}
            {isCurrentResult && activeResult?.annotated_image_base64 ? (
              // Annotated Inspection Result (only when result matches currently active image)
              <div className="w-full h-full min-w-0 min-h-0 flex items-center justify-center p-3 relative overflow-hidden">
                <img
                  src={activeResult.annotated_image_base64}
                  alt="Annotated PCB Defect Detection Map"
                  className="max-h-full max-w-full w-auto h-auto object-contain select-none rounded-lg shadow-md"
                />
              </div>
            ) : previewUrl ? (
              // Raw Loaded Image Preview (immediately displays newly selected image)
              <div className="w-full h-full min-w-0 min-h-0 flex items-center justify-center p-3 relative overflow-hidden">
                <img
                  src={previewUrl}
                  alt="PCB Image Preview"
                  className="max-h-full max-w-full w-auto h-auto object-contain select-none rounded-lg shadow-md"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-lg glass-elevated border border-[rgba(239,223,197,0.18)] text-xs font-mono text-[#EFDFC5] flex items-center gap-2 shadow-xl pointer-events-none select-none">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Image ready. Click &quot;Run Detection&quot; in the toolbar.</span>
                </div>
              </div>
            ) : (
              // Compact Upload Drop Zone
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm glass-elevated border border-[rgba(239,223,197,0.18)] rounded-2xl shadow-2xl">
                <div className="w-12 h-12 rounded-xl bg-[rgba(38,34,36,0.8)] border border-[rgba(239,223,197,0.15)] flex items-center justify-center text-[#DC2011] mb-3 shadow-inner">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-[#EFDFC5] mb-1">
                  Upload PCB Board Image
                </h3>
                <p className="text-xs text-[#B7B7BA] mb-4 leading-relaxed">
                  Drag and drop a PCB image here, or choose from local files or test samples.
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleBrowseFiles}
                    className="px-3.5 py-1.5 rounded-lg bg-[#8F0B13] hover:bg-[#DC2011] text-[#EFDFC5] font-semibold text-xs transition-colors border border-[#8F0B13] shadow-sm"
                  >
                    Browse Local File
                  </button>
                  {samples.length > 0 && (
                    <button
                      onClick={() => handleSelectSample(samples[0].filename)}
                      className="px-3 py-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] font-medium text-xs border border-[rgba(239,223,197,0.15)] transition-colors"
                    >
                      Use Sample
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fixed-Height Bottom Results Bar */}
          {isCurrentResult && activeResult ? (
            <div className="h-14 flex-shrink-0 mt-3 px-4 rounded-xl glass-panel flex items-center justify-between gap-3 text-xs select-none shadow-lg">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                  activeResult.defect_count > 0
                    ? 'text-[#DC2011] bg-[#380F17] border border-[#8F0B13]'
                    : activeResult.status === 'Unverified'
                    ? 'text-amber-400 bg-amber-950/40 border border-amber-800/60'
                    : 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/60'
                }`}>
                  {activeResult.defect_count > 0 ? (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-[#DC2011]" />
                      <span>{activeResult.defect_count} Defects Found</span>
                    </>
                  ) : activeResult.status === 'Unverified' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Unverified Model Result</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Clean PCB (0 Defects)</span>
                    </>
                  )}
                </span>

                <div className="flex items-center gap-3 text-[#B7B7BA] text-[11px] font-mono truncate">
                  <span className="whitespace-nowrap">
                    Latency: <strong className="text-[#EFDFC5] font-semibold">{activeResult.inference_time_ms} ms</strong>
                  </span>
                  <span className="hidden sm:inline text-[rgba(239,223,197,0.2)]">|</span>
                  <span className="hidden sm:inline whitespace-nowrap">
                    Dimensions: <strong className="text-[#EFDFC5] font-semibold">{activeResult.image_width}×{activeResult.image_height} px</strong>
                  </span>
                </div>
              </div>

              <button
                onClick={onNavigateToResults}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#380F17] hover:bg-[#8F0B13] text-[#EFDFC5] border border-[#8F0B13] font-medium text-xs transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5 text-[#DC2011]" />
                View Bounding Boxes
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          ) : previewUrl ? (
            <div className="h-14 flex-shrink-0 mt-3 px-4 rounded-xl glass-panel flex items-center justify-between gap-3 text-xs select-none shadow-lg">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Image Ready</span>
                </span>

                <div className="flex items-center gap-3 text-[#B7B7BA] text-[11px] font-mono truncate">
                  {imageDimensions && (
                    <span className="whitespace-nowrap">
                      Dimensions: <strong className="text-[#EFDFC5] font-semibold">{imageDimensions.width}×{imageDimensions.height} px</strong>
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleRunDetection}
                disabled={isDetecting || !modelStatus?.loaded}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all whitespace-nowrap flex-shrink-0 ${
                  isDetecting || !modelStatus?.loaded
                    ? 'bg-[rgba(38,34,36,0.6)] text-[#B7B7BA]/50 cursor-not-allowed border border-[rgba(239,223,197,0.1)]'
                    : 'bg-[#8F0B13] hover:bg-[#DC2011] text-[#EFDFC5] border border-[#8F0B13] shadow-[0_0_10px_rgba(220,32,17,0.3)]'
                }`}
              >
                {isDetecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#EFDFC5]" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-[#EFDFC5]" />
                    Run Detection
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>

        {/* Collapsible Detection Parameters Flyout Panel */}
        {showSettings && (
          <div className="w-72 border-l border-[rgba(239,223,197,0.15)] glass-elevated p-4 flex flex-col justify-between flex-shrink-0 z-20 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(239,223,197,0.12)]">
                <h2 className="text-xs font-semibold text-[#EFDFC5] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#DC2011]" />
                  Detection Thresholds
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[rgba(48,40,43,0.8)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#B7B7BA]">Confidence Threshold:</span>
                  <span className="font-mono text-[#EFDFC5] font-bold">
                    {Math.round(confThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[rgba(20,16,18,0.85)] border border-[rgba(239,223,197,0.15)] rounded-lg appearance-none cursor-pointer accent-[#DC2011]"
                />
                <span className="text-[10px] text-[#B7B7BA] block leading-snug">
                  Higher values filter noise; lower values detect subtle anomalies.
                </span>
              </div>

              {/* IoU Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#B7B7BA]">NMS IoU Threshold:</span>
                  <span className="font-mono text-[#EFDFC5] font-bold">
                    {Math.round(iouThreshold * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={iouThreshold}
                  onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[rgba(20,16,18,0.85)] border border-[rgba(239,223,197,0.15)] rounded-lg appearance-none cursor-pointer accent-[#8F0B13]"
                />
                <span className="text-[10px] text-[#B7B7BA] block leading-snug">
                  Non-maximum suppression threshold for overlapping defect proposals.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[rgba(239,223,197,0.12)] text-[11px] text-[#B7B7BA] font-mono">
              <div>Device: {modelStatus?.device?.toUpperCase() || 'CPU'}</div>
              <div>Model: {modelStatus?.model_info?.name || 'Unloaded'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioView;
