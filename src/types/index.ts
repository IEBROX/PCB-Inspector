export interface DefectItem {
  id: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  width?: number;
  height?: number;
  area?: number;
}

export interface DetectionResult {
  inspection_id?: number;
  filename: string;
  defect_count: number;
  detections: DefectItem[];
  defect_summary: Record<string, number>;
  inference_time_ms: number;
  image_width: number;
  image_height: number;
  model_name: string;
  confidence_threshold: number;
  iou_threshold: number;
  original_image_base64: string;
  annotated_image_base64: string;
  status?: 'Completed' | 'Review Required' | 'Unverified' | 'Failed';
}

export interface ModelInfo {
  name: string;
  path: string;
  file_size_mb: number;
  device: string;
  classes_count: number;
  classes: string[];
  type: string;
}

export interface ModelStatus {
  loaded: boolean;
  weights_path: string | null;
  device: string;
  cuda_available: boolean;
  gpu_name: string | null;
  conf_threshold: number;
  iou_threshold: number;
  supported_classes: string[];
  is_pcb_model?: boolean;
  load_error: string | null;
  model_info: ModelInfo | null;
}

export interface InspectionRecord {
  id: number;
  timestamp: string;
  filename: string;
  image_width: number;
  image_height: number;
  defect_count: number;
  inference_time_ms: number;
  model_name: string;
  confidence_threshold: number;
  iou_threshold: number;
  original_image_path?: string;
  annotated_image_path?: string;
  status?: 'Completed' | 'Review Required' | 'Unverified' | 'Failed';
  summary: Record<string, number>;
  detections?: DefectItem[];
}

export interface InspectionStats {
  total_inspections: number;
  valid_inspections?: number;
  unverified_inspections?: number;
  defective_pcbs: number;
  clean_pcbs: number;
  defect_rate_percentage: number;
  total_defects_found: number;
  total_defects_valid?: number;
  avg_inference_time_ms: number;
  defects_by_class: Record<string, number>;
  recent_inspections: Array<{
    id: number;
    timestamp: string;
    filename: string;
    defect_count: number;
    inference_time_ms: number;
    model_name?: string;
    status?: 'Completed' | 'Review Required' | 'Unverified' | 'Failed';
  }>;
}

export interface SampleImage {
  filename: string;
  defect_hint: string;
  url: string;
}

// Global Electron API declared in window
declare global {
  interface Window {
    electronAPI?: {
      openFileDialog: (options?: any) => Promise<string[] | null>;
      openImageDialog?: (options?: any) => Promise<{ filePath: string; filename: string; mimeType: string; base64: string } | null>;
      saveFileDialog: (options?: any) => Promise<string | null>;
      getAppInfo: () => Promise<{ version: string; platform: string; arch: string }>;
      checkBackendStatus: () => Promise<{ running: boolean; port: number; url: string; error?: string | null }>;
      restartBackend: () => Promise<boolean>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isMaximized: () => Promise<boolean>;
    };
  }
}
