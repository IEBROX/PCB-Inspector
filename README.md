# PCB Inspector - Industrial Optical Inspection Desktop Application

A production-grade Windows desktop application for automated PCB (Printed Circuit Board) defect detection using a trained YOLO deep learning model, Electron, React, TypeScript, Tailwind CSS, and Python FastAPI.

---

## 🌟 Key Application Features

1. **Native Windows Desktop Shell**
   - High-performance Electron desktop shell with frameless industrial window frame.
   - Context isolation enabled, Node integration disabled in the renderer, and a restricted `preload` API exposing only safe dialogs and system telemetry.
   - Self-contained Python backend supervisor (`pyManager.ts`) that automatically boots, monitors, and gracefully terminates the AI inference engine.

2. **PCB Quality Assurance Dashboard**
   - Live inspection statistics: Total boards inspected, Defect Rate %, Clean vs Defective board counts, Average inference latency (ms).
   - Defect Class Distribution: Real-time distribution breakdown across the 6 industrial fault classes.
   - Active Neural Detector status card: weights filename, device acceleration (CPU / CUDA), thresholds, and health.
   - Recent Inspections audit log.

3. **PCB Inspection Studio**
   - Image ingestion via native Windows file dialog, drag-and-drop, or pre-loaded real test samples.
   - **Interactive Before / After Split Comparison Slider**: Reveals predicted defect annotations directly over the raw PCB board in real time.
   - **Side-by-Side Dual View**: Compares the raw input board alongside the defect map.
   - **Zoom & Pan Defect Inspection**: Sub-pixel panning and zoom capabilities to analyze microscopic hairline traces and small surface-mount defects.
   - Real-time parameter tuning: adjust Confidence Cutoff and NMS IoU threshold before running detection.

4. **Results & Bounding Box Analysis Panel**
   - Defect categorization chips with industrial high-visibility color scheme.
   - Comprehensive bounding box coordinate table (`[x1, y1, x2, y2]`, width, height, area).
   - Click-to-focus: clicking any defect in the table smoothly zooms and centers the viewport on that defect.
   - Filter by defect class or minimum confidence score.
   - One-click export to CSV and JSON.

5. **Model Manager**
   - Configurable local `.pt` weights path loading with dynamic validation.
   - Pre-configured presets (`models/pcb_defect_yolov8.pt`, `models/yolov8n.pt`, etc.).
   - Hardware device selector: CPU or CUDA GPU acceleration.
   - Missing weights are handled gracefully with instructional guidance; **never generates fake or fabricated detections**.

6. **Inspection History & Report Export**
   - SQLite persistent local datastore (`backend/data/pcb_inspections.db`).
   - Detailed inspection inspection modal with stored thumbnail and original/annotated image retrieval.
   - Audit report export options: CSV, JSON, and print-ready QA inspection certificate.

---

## 🔍 Supported PCB Defect Taxonomy

The application inspects and classifies the 6 standard PCB manufacturing fault categories:
1. `missing_hole`: Holes omitted during drilling operations.
2. `mouse_bite`: Edge notches, roughness, and substrate breakout erosion.
3. `open_circuit`: Trace discontinuities and broken copper tracks.
4. `short`: Unintended electrical copper bridges between adjacent tracks.
5. `spur`: Extraneous copper protrusions along conductor track edges.
6. `spurious_copper`: Isolated etch residue or unetched copper islands.

---

## 🏗️ Architecture & Directory Structure

```
UI/
├── electron/
│   ├── main.ts              # Electron main process (secure window & IPC handlers)
│   ├── preload.ts           # Restricted contextBridge API
│   └── pyManager.ts         # Python FastAPI service lifecycle supervisor
├── backend/
│   ├── main.py              # FastAPI REST service & endpoints
│   ├── model_service.py     # Ultralytics YOLO inference & visual annotator
│   ├── database.py          # SQLite persistence layer & statistics
│   └── requirements.txt     # Python backend dependencies
├── models/
│   ├── README.md            # Model guide & weight specifications
│   ├── sample_yolo_model.pt # Trained model weights
│   └── yolov8n.pt           # Base neural backbone weights
├── samples/                 # High-resolution real PCB test images
│   ├── 01_missing_hole.jpg
│   ├── 04_mouse_bite.jpg
│   ├── 06_open_circuit.jpg
│   ├── 08_short.jpg
│   ├── 10_spur.jpg
│   ├── 12_spurious_copper.jpg
│   └── clean_pcb_master.jpg
├── src/
│   ├── api/                 # REST client for FastAPI backend
│   ├── components/
│   │   ├── Dashboard/       # Telemetry & KPI dashboard
│   │   ├── Studio/          # Inspection studio, split slider & zoom viewer
│   │   ├── Results/         # Bounding boxes table & focus controls
│   │   ├── ModelManager/    # Weights loader & threshold calibration
│   │   ├── History/         # SQLite history logs & inspection modal
│   │   ├── Sidebar.tsx      # Collapsible industrial sidebar
│   │   └── TitleBar.tsx     # Frameless desktop window header
│   ├── types/               # TypeScript definitions
│   ├── App.tsx              # Root application router & state
│   ├── main.tsx             # React entrypoint
│   └── index.css            # Dark industrial design system
├── package.json             # Electron & Vite configuration
├── tsconfig.json            # React TypeScript config
├── tsconfig.electron.json   # Electron TypeScript config
├── vite.config.ts           # Vite bundler configuration
└── tailwind.config.js       # Industrial color tokens
```

---

## 🧠 Model Integration (Google Colab Workflow)

This project is strictly designed to use **your own PCB defect detection model checkpoint (`best.pt`)**, trained on your PCB dataset in Google Colab:
- **No Automatic Downloads**: The app never downloads or substitutes generic YOLO pretrained models.
- **Configurable Path**: You can select any local `.pt` file on your system via the Model Manager.
- **Graceful Unloaded State**: When no model is loaded, the desktop UI clearly displays `"No trained PCB model loaded"`, optical inference is disabled, and **no fake detections are ever fabricated**.

### Connecting your Colab Model:
1. After training your YOLO model in Google Colab, download your best weights checkpoint:
   ```python
   from google.colab import files
   files.download('runs/detect/train/weights/best.pt')
   ```
2. In the **PCB Inspector** desktop app, open **Model Manager**.
3. Click **Browse .pt File** (or enter the path where you saved `best.pt`), then click **LOAD CHECKPOINT**.
4. The system validates the model, loads your defect classes, and enables optical detection.

### 2. Python Dependencies
In PowerShell:
```powershell
python -m pip install fastapi uvicorn python-multipart ultralytics torch torchvision opencv-python pillow aiofiles
```

### 3. Node Dependencies
In the `UI` directory:
```powershell
npm install
```

### 4. Running the Desktop Application in Development Mode
To run the full desktop application with hot-reloading:
```powershell
npm run electron:dev
```
*Note: Electron will start the React UI and automatically spin up the Python FastAPI AI backend on `http://127.0.0.1:8000`.*

### 5. Running the Desktop Application in Production Preview
```powershell
npm run electron:preview
```

### 6. Packaging the Windows Desktop Installer (.exe)
To generate the distributable Windows NSIS installer and portable executable:
```powershell
npm run dist
```
The installer will be generated in the `release/` directory:
`release/PCB Inspector-Setup-1.0.0.exe`

---

## 🔒 Security Best Practices Implemented
- **Restricted Preload API**: Renderer has zero direct access to Node.js APIs (`fs`, `child_process`). All native interactions occur through explicit, validated IPC channels.
- **Context Isolation**: `contextIsolation: true` and `nodeIntegration: false` enforced.
- **Content Security Policy (CSP)**: Explicitly restricts script execution and network endpoints to `self` and local loopback `127.0.0.1:8000`.
- **No Fabricated Data**: The backend performs real YOLO neural predictions using Ultralytics. When weights are missing or uninitialized, inference is gracefully halted and reported to the operator.
