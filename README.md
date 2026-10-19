# PCB INSPECTOR

PCB INSPECTOR is a Windows desktop application for inspecting printed circuit board (PCB) images with a trained YOLO object-detection model. It combines an Electron desktop shell, a React/TypeScript interface, and a Python FastAPI backend to run local inspections and visualize potential manufacturing defects.

## Features

- **PCB defect detection:** Run a trained YOLO checkpoint against PCB images.
- **Six defect categories:** `missing_hole`, `mouse_bite`, `open_circuit`, `short`, `spur`, and `spurious_copper`.
- **Inspection studio:** Upload images, compare original images with annotated results, and zoom/pan for closer inspection.
- **Detection results:** Review defect classes, confidence scores, and bounding-box details.
- **Model Manager:** Load a local `.pt` checkpoint and review model status.
- **Inspection history:** Store inspection metadata and images in a local SQLite database.
- **Exports:** Export inspection information to CSV or JSON.
- **Desktop packaging:** Build a Windows installer with Electron Builder and NSIS.
- **Local processing:** The application runs its backend on the local machine and binds to loopback (`127.0.0.1`) by default.

## Technology Stack

- **Desktop:** Electron
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend API:** Python, FastAPI, Uvicorn
- **Detection:** Ultralytics YOLO, PyTorch, Torchvision
- **Image processing:** OpenCV, Pillow, NumPy
- **History storage:** SQLite
- **Packaging:** PyInstaller, Electron Builder, NSIS

## Repository Structure

```text
PCB-Inspector/
├── backend/
│   ├── main.py                 # FastAPI app and inspection endpoints
│   ├── model_service.py        # YOLO model loading and inference
│   ├── database.py             # Local inspection-history database
│   ├── requirements.txt        # Python dependencies
│   └── models/                 # Local model weights (not committed)
├── electron/
│   ├── main.ts                 # Electron main process and IPC handlers
│   ├── preload.ts              # Restricted renderer-to-main API
│   └── pyManager.ts            # Starts and manages the Python backend
├── models/
│   └── README.md               # Model-weight notes
├── samples/                    # Sample PCB images for testing
├── scripts/
│   └── generate_icon.py        # Generates Windows/desktop icon assets
├── src/                        # React/TypeScript interface
├── backend.spec                # PyInstaller build specification
├── package.json                # Scripts and Electron Builder configuration
├── package-lock.json           # Locked npm dependency versions
└── README.md
```

## Model Weights

The trained model checkpoint is not stored in this Git repository because `.pt` files are excluded by `.gitignore`.

To enable inspection with the project's default checkpoint, place your trained weights at:

```text
backend/models/pcb_best.pt
```

Alternatively, launch the application and use **Model Manager** to browse for a compatible local `.pt` checkpoint and load it. If no checkpoint is available or loaded, detection cannot run until a valid model is provided.

Do not commit model weights to the repository accidentally. If you have permission to distribute the checkpoint and want to version it with the project, consider Git Large File Storage (Git LFS) or provide it through an appropriate release/download location.

## Requirements

For development on Windows, install:

- Git
- Node.js and npm
- Python compatible with the dependencies in `backend/requirements.txt`
- A trained YOLO `.pt` checkpoint for inference

CPU inference is supported when the installed PyTorch build supports the environment. CUDA acceleration requires a compatible NVIDIA driver and compatible PyTorch/CUDA installation; it is optional.

## Run from Source

### 1. Clone the repository

```powershell
git clone https://github.com/IEBROX/PCB-Inspector.git
cd PCB-Inspector
```

### 2. Install JavaScript dependencies

```powershell
npm ci
```

### 3. Create and activate a Python environment

```powershell
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
```

### 4. Add model weights

Place `pcb_best.pt` in `backend/models/`, or start the app and select a compatible checkpoint in **Model Manager**.

### 5. Start the desktop app in development mode

```powershell
npm run electron:dev
```

The Electron backend manager starts the FastAPI service locally. The default backend port is `8000`; if that port is already occupied, the app may select another available port.

Other configured commands include:

```powershell
npm run build
npm run build:electron
npm run backend
```

`npm run backend` starts the Python backend directly with the active Python interpreter. To run it successfully, install the backend dependencies in that interpreter first.

## Build a Windows Installer

The project uses PyInstaller to package the backend and Electron Builder/NSIS to create the Windows installer.

Before building, install the Python packaging dependency and the project dependencies:

```powershell
python -m pip install -r backend\requirements.txt
python -m pip install pyinstaller
npm ci
```

Generate the icon files required by the current Electron Builder configuration:

```powershell
python scripts\generate_icon.py
```

For a bundled default model, confirm that `backend/models/pcb_best.pt` exists before starting the build. The packaging configuration includes that checkpoint only when the file is present.

Build the installer:

```powershell
npm run dist
```

The configured installer output directory is:

```text
release/
```

The current Electron Builder configuration names the installer:

```text
PCB-Inspector-Setup.exe
```

Check the actual file in `release/` after the build completes. A successful build alone does not verify runtime inference; launch the packaged application, check backend startup, and test a PCB image before distributing the installer.

## Backend API

The local FastAPI service includes endpoints for health/model status, model loading and configuration, detection, inspection history, statistics, sample images, and CSV/JSON exports.

Useful development endpoint:

```text
http://127.0.0.1:8000/health
```

If the application chooses a different port because the default is occupied, use the port reported by the running application/backend manager.

## Privacy and Local Data

Inspection history and saved original/annotated images are stored locally by the backend. In production, the backend uses the per-user application data directory when configured by Electron. Local runtime data is excluded from Git by `.gitignore`.

Before publishing changes, review staged files and make sure you have not included credentials, private PCB images, database files, virtual environments, generated build output, or model weights unintentionally.

## Troubleshooting

- **No model loaded:** Add the trained checkpoint at `backend/models/pcb_best.pt`, or select a local `.pt` file from Model Manager.
- **Backend does not start:** Confirm Python dependencies are installed, check whether port `8000` is in use, and review the backend log. The packaged app writes backend diagnostics to the application's user-data log directory.
- **Installer build fails on icon files:** Run `python scripts/generate_icon.py` and retry `npm run dist`.
- **PyInstaller packaging fails:** Review the full PyInstaller error output and dependency versions in the active Python environment. Native PyTorch/Torchvision dependencies must be compatible with each other.
- **A clean clone cannot run inference:** The model weights are intentionally not included in Git and must be supplied separately.

## Contributing

Bug reports and improvements are welcome. Please describe the issue, reproduction steps, and your environment when opening an issue.

## License

No license has been added to this repository yet. Until a license is selected and included, do not assume that the source code may be freely reused, modified, or redistributed.

---

**PCB INSPECTOR** — Local desktop inspection for PCB defect visualization.
