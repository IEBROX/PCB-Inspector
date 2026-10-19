import {
  DetectionResult,
  ModelStatus,
  InspectionRecord,
  InspectionStats,
  SampleImage,
} from '../types';

export const BACKEND_BASE_URL = 'http://127.0.0.1:8000';

class BackendClient {
  private baseUrl: string = BACKEND_BASE_URL;

  public setBaseUrl(url: string) {
    if (url && typeof url === 'string') {
      this.baseUrl = url.replace(/\/+$/, '');
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async getHealth(): Promise<{ status: string; model_loaded: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`Health check returned ${res.status}`);
      return await res.json();
    } catch (e: any) {
      throw new Error(`Backend offline: ${e.message}`);
    }
  }

  public async getModelStatus(): Promise<ModelStatus> {
    const res = await fetch(`${this.baseUrl}/model/status`);
    if (!res.ok) throw new Error(`Failed to fetch model status: ${res.statusText}`);
    return await res.json();
  }

  public async loadModel(weightsPath: string): Promise<{ success: boolean; message: string; status: ModelStatus }> {
    const res = await fetch(`${this.baseUrl}/model/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights_path: weightsPath }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to load model');
    }
    return data;
  }

  public async unloadModel(): Promise<{ success: boolean; message: string; status: ModelStatus }> {
    const res = await fetch(`${this.baseUrl}/model/unload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Failed to unload model');
    }
    return data;
  }

  public async updateConfig(confThreshold?: number, iouThreshold?: number): Promise<{ success: boolean; config: any }> {
    const res = await fetch(`${this.baseUrl}/model/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conf_threshold: confThreshold,
        iou_threshold: iouThreshold,
      }),
    });
    return await res.json();
  }

  public async detect(
    file: File | Blob,
    filename: string,
    confThreshold?: number,
    iouThreshold?: number
  ): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append('file', file, filename);
    if (confThreshold !== undefined) {
      formData.append('confidence_threshold', String(confThreshold));
    }
    if (iouThreshold !== undefined) {
      formData.append('iou_threshold', String(iouThreshold));
    }

    const res = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = typeof data.detail === 'object' ? data.detail.message : data.detail;
      throw new Error(errMsg || 'Inference failed.');
    }
    return data.data;
  }

  public async getHistory(limit = 50, offset = 0): Promise<InspectionRecord[]> {
    const res = await fetch(`${this.baseUrl}/history?limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error('Failed to fetch history.');
    const data = await res.json();
    return data.records;
  }

  public async getInspection(id: number): Promise<InspectionRecord> {
    const res = await fetch(`${this.baseUrl}/history/${id}`);
    if (!res.ok) throw new Error('Inspection record not found.');
    const data = await res.json();
    return data.data;
  }

  public async deleteInspection(id: number): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/history/${id}`, { method: 'DELETE' });
    return res.ok;
  }

  public async clearHistory(): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/history/clear`, { method: 'POST' });
    return res.ok;
  }

  public async getStats(): Promise<InspectionStats> {
    const res = await fetch(`${this.baseUrl}/stats`);
    if (!res.ok) throw new Error('Failed to fetch statistics.');
    const data = await res.json();
    return data.stats;
  }

  public async getSamples(): Promise<SampleImage[]> {
    try {
      const res = await fetch(`${this.baseUrl}/samples`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.samples;
    } catch {
      return [];
    }
  }

  public getSampleImageUrl(filename: string): string {
    return `${this.baseUrl}/samples/${filename}`;
  }

  public getStorageImageUrl(filename: string): string {
    return `${this.baseUrl}/storage/${filename}`;
  }

  public getExportCsvUrl(): string {
    return `${this.baseUrl}/export/csv`;
  }

  public getExportJsonUrl(): string {
    return `${this.baseUrl}/export/json`;
  }
}

export const api = new BackendClient();
