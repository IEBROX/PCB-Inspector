import React, { useState, useEffect } from 'react';
import {
  Cpu,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileCheck,
  Zap,
  Info,
  ShieldCheck,
  HardDrive,
  ChevronDown,
  ChevronUp,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import { ModelStatus } from '../../types';
import { api } from '../../api/backendClient';

interface ModelManagerViewProps {
  modelStatus: ModelStatus | null;
  onModelStatusUpdated: () => void;
}

export const ModelManagerView: React.FC<ModelManagerViewProps> = ({
  modelStatus,
  onModelStatusUpdated,
}) => {
  const [customPath, setCustomPath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showColabHelp, setShowColabHelp] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  useEffect(() => {
    if (modelStatus?.weights_path) {
      setCustomPath(modelStatus.weights_path);
    }
  }, [modelStatus]);

  // Browse local files using Electron native dialog
  const handleBrowseLocal = async () => {
    if (window.electronAPI) {
      try {
        const filePaths = await window.electronAPI.openFileDialog({
          title: 'Select YOLO Model Weights (.pt)',
          filters: [
            { name: 'PyTorch YOLO Weights (*.pt)', extensions: ['pt'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (filePaths && filePaths.length > 0) {
          setCustomPath(filePaths[0]);
          return;
        }
      } catch (err) {
        console.warn('Electron dialog fallback:', err);
      }
    }
  };

  const handleLoadModel = async () => {
    if (!customPath) {
      setFeedback({ type: 'error', message: 'Please specify or browse for a .pt weights file.' });
      return;
    }
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.loadModel(customPath);
      setFeedback({ type: 'success', message: res.message || 'Model loaded successfully!' });
      onModelStatusUpdated();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Failed to load model weights.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnloadModel = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await api.unloadModel();
      setFeedback({ type: 'success', message: res.message || 'Model unloaded successfully.' });
      setCustomPath('');
      onModelStatusUpdated();
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Failed to unload model.' });
    } finally {
      setLoading(false);
    }
  };


  const handleCopyCode = () => {
    navigator.clipboard.writeText(`from google.colab import files\nfiles.download('runs/detect/train/weights/best.pt')`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 pb-28 space-y-6 bg-transparent relative">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(239,223,197,0.12)]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#EFDFC5] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#DC2011]" />
            Model Manager
          </h1>
          <p className="text-xs text-[#B7B7BA] mt-0.5">
            Active checkpoint verification, weights loading, and inference calibration
          </p>
        </div>

        <button
          onClick={onModelStatusUpdated}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(38,34,36,0.7)] border border-[rgba(239,223,197,0.15)] text-[#B7B7BA] hover:text-[#EFDFC5] hover:bg-[rgba(48,40,43,0.85)] text-xs font-mono transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'glass-panel border-emerald-700/60 text-emerald-400'
              : 'bg-[#380F17]/90 backdrop-blur-md border-[#DC2011] text-[#EFDFC5]'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="font-bold hover:text-[#EFDFC5] ml-2 text-[#B7B7BA]"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: Active Model Information */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(239,223,197,0.12)]">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#DC2011]" />
            <h2 className="text-sm font-semibold text-[#EFDFC5]">
              1. Active Model Information
            </h2>
          </div>

          <span
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-medium ${
              modelStatus?.loaded
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-[#380F17] text-amber-400 border border-amber-800/60'
            }`}
          >
            {modelStatus?.loaded ? 'Loaded' : 'No Model Loaded'}
          </span>
        </div>

        {modelStatus?.loaded && modelStatus.model_info ? (
          /* Actual confirmed model metadata */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl glass-subtle">
                <span className="text-[10px] text-[#B7B7BA] font-mono block">MODEL NAME</span>
                <span className="text-sm font-bold text-[#EFDFC5] font-mono break-all mt-1 block">
                  {modelStatus.model_info.name}
                </span>
              </div>

              <div className="p-3 rounded-xl glass-subtle">
                <span className="text-[10px] text-[#B7B7BA] font-mono block">TASK / ARCHITECTURE</span>
                <span className="text-sm font-bold text-[#EFDFC5] font-mono uppercase mt-1 block">
                  {modelStatus.model_info.type || 'Detection'}
                </span>
              </div>

              <div className="p-3 rounded-xl glass-subtle">
                <span className="text-[10px] text-[#B7B7BA] font-mono block">DEVICE</span>
                <span className="text-sm font-bold text-[#EFDFC5] font-mono uppercase mt-1 block">
                  {modelStatus.device} {modelStatus.cuda_available ? `(${modelStatus.gpu_name || 'CUDA'})` : '(CPU)'}
                </span>
              </div>

              <div className="p-3 rounded-xl glass-subtle">
                <span className="text-[10px] text-[#B7B7BA] font-mono block">CHECKPOINT FILE SIZE</span>
                <span className="text-sm font-bold text-[#EFDFC5] font-mono mt-1 block">
                  {modelStatus.model_info.file_size_mb} MB
                </span>
              </div>
            </div>

            {/* Checkpoint File Path */}
            <div className="p-3 rounded-xl bg-[rgba(20,16,18,0.7)] border border-[rgba(239,223,197,0.12)] text-xs font-mono">
              <span className="text-[10px] text-[#B7B7BA] block mb-1">LOCAL CHECKPOINT PATH:</span>
              <span className="text-[#EFDFC5] select-text break-all">{modelStatus.weights_path}</span>
            </div>

            {/* Confirmed Class Names */}
            <div>
              <span className="text-xs font-medium text-[#EFDFC5] block mb-2">
                Confirmed Model Classes ({modelStatus.model_info.classes_count}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {modelStatus.model_info.classes.map((clsName) => (
                  <span
                    key={clsName}
                    className="px-2.5 py-0.5 rounded-lg bg-[rgba(38,34,36,0.7)] border border-[rgba(239,223,197,0.14)] text-xs font-mono text-[#EFDFC5]"
                  >
                    {clsName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Clear unavailable state */
          <div className="p-4 rounded-xl glass-subtle text-xs text-[#B7B7BA] space-y-1">
            <p className="font-semibold text-[#EFDFC5]">
              No trained PCB model checkpoint is currently active.
            </p>
            <p>
              To run inspections, select and load your trained PCB defect model checkpoint (<code className="text-[#EFDFC5] font-mono">best.pt</code>) below.
            </p>
          </div>
        )}
      </div>

      {/* SECTION 2: Checkpoint Selection and Loading */}
      <div className="glass-panel p-5 space-y-4">
        <div className="pb-3 border-b border-[rgba(239,223,197,0.12)]">
          <h2 className="text-sm font-semibold text-[#EFDFC5] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#DC2011]" />
            2. Checkpoint Selection & Loading
          </h2>
          <p className="text-xs text-[#B7B7BA] mt-0.5">
            Select and load your custom trained PyTorch weights checkpoint (.pt)
          </p>
        </div>

        {/* Path input and action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="Select or enter path to .pt file (e.g. C:\Users\HP\Downloads\best.pt)"
            className="glass-input flex-1 px-3 py-2 text-xs font-mono placeholder-[#B7B7BA]/50 focus:outline-none focus:border-[#DC2011]"
          />

          <button
            onClick={handleBrowseLocal}
            className="px-3.5 py-2 rounded-lg bg-[rgba(38,34,36,0.7)] hover:bg-[rgba(48,40,43,0.85)] text-[#EFDFC5] border border-[rgba(239,223,197,0.15)] hover:border-[rgba(220,32,17,0.45)] text-xs font-medium flex items-center justify-center gap-1.5 transition-all whitespace-nowrap shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#DC2011]" />
            Browse .pt File
          </button>

          <button
            onClick={handleLoadModel}
            disabled={loading || !customPath}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
              loading || !customPath
                ? 'bg-[rgba(38,34,36,0.6)] text-[#B7B7BA]/50 border-[rgba(239,223,197,0.1)] cursor-not-allowed'
                : 'bg-[#8F0B13] hover:bg-[#DC2011] text-[#EFDFC5] border-[#8F0B13] cursor-pointer shadow-[0_0_12px_rgba(220,32,17,0.35)]'
            }`}
          >
            {loading ? 'Loading...' : 'Load Model'}
          </button>

          {modelStatus?.loaded && (
            <button
              onClick={handleUnloadModel}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg bg-[rgba(38,34,36,0.6)] hover:bg-[#380F17] text-[#B7B7BA] hover:text-[#DC2011] border border-[rgba(239,223,197,0.12)] hover:border-[#8F0B13] text-xs font-medium flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              title="Unload current model from memory"
            >
              <XCircle className="w-3.5 h-3.5" />
              Unload Model
            </button>
          )}
        </div>

        {/* Collapsible Google Colab Help Section */}
        <div className="rounded-xl border border-[rgba(239,223,197,0.12)] bg-[rgba(20,16,18,0.7)] backdrop-blur-sm overflow-hidden">
          <button
            onClick={() => setShowColabHelp(!showColabHelp)}
            className="w-full p-3.5 flex items-center justify-between text-xs font-medium text-[#EFDFC5] hover:bg-[rgba(48,40,43,0.4)] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#DC2011]" />
              Google Colab Export Instructions
            </span>
            {showColabHelp ? (
              <ChevronUp className="w-4 h-4 text-[#B7B7BA]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#B7B7BA]" />
            )}
          </button>

          {showColabHelp && (
            <div className="p-4 pt-1 border-t border-[rgba(239,223,197,0.12)] text-xs text-[#B7B7BA] space-y-2.5 leading-relaxed font-sans">
              <p>
                1. After training finishes in Google Colab, export and download your <code className="text-[#EFDFC5] font-mono">best.pt</code> checkpoint:
              </p>
              <div className="relative">
                <pre className="p-3 rounded-lg bg-[rgba(16,13,14,0.9)] text-[#EFDFC5] font-mono text-[11px] overflow-x-auto border border-[rgba(239,223,197,0.12)]">
{`from google.colab import files
files.download('runs/detect/train/weights/best.pt')`}
                </pre>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 p-1.5 rounded bg-[rgba(38,34,36,0.8)] hover:bg-[rgba(48,40,43,0.95)] text-[#B7B7BA] hover:text-[#EFDFC5] transition-colors"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p>
                2. Click <strong className="text-[#EFDFC5]">Browse .pt File</strong> above, select the downloaded checkpoint on your machine, and click <strong className="text-[#EFDFC5]">Load Model</strong>.
              </p>
              <p>
                3. The application will verify the model architecture and enable optical defect inspection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelManagerView;
