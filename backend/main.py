import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Ensure torchvision C++ ops (nms, etc.) register before Ultralytics inference in PyInstaller builds.
try:
    import torch  # noqa: F401
    import torchvision  # noqa: F401
    from torchvision.ops import nms as _torchvision_nms  # noqa: F401
except Exception as _tv_preload_err:
    print(f"[PCB Backend] Torchvision preload warning: {_tv_preload_err}")
import io
import csv
import json
import shutil
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel

from database import (
    init_db,
    save_inspection,
    get_history,
    get_inspection_details,
    delete_inspection,
    clear_all_history,
    get_statistics,
    STORAGE_DIR
)
from model_service import ModelService, STANDARD_PCB_CLASSES

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="PCB Inspector AI Backend",
    description="Ultralytics YOLO PCB Defect Detection Service",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Electron desktop app and Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_resource_path(*subpaths: str) -> str:
    """Resolve file paths across development, PyInstaller bundle, and packaged Electron directories."""
    # 1. Custom resources directory passed by Electron
    res_dir = os.environ.get("PCB_RESOURCES_DIR")
    if res_dir:
        candidate = os.path.join(res_dir, *subpaths)
        if os.path.exists(candidate):
            return candidate

    # 2. PyInstaller extraction folder (_MEIPASS)
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        candidate = os.path.join(sys._MEIPASS, *subpaths)
        if os.path.exists(candidate):
            return candidate

    # 3. Next to executable or in _internal
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(sys.executable)
        candidate = os.path.join(exe_dir, *subpaths)
        if os.path.exists(candidate):
            return candidate
        internal_candidate = os.path.join(exe_dir, "_internal", *subpaths)
        if os.path.exists(internal_candidate):
            return internal_candidate
        # Parent candidate (e.g. resources/backend/../models)
        parent_candidate = os.path.abspath(os.path.join(exe_dir, "..", *subpaths))
        if os.path.exists(parent_candidate):
            return parent_candidate

    # 4. Relative to current working directory
    cwd_candidate = os.path.join(os.getcwd(), *subpaths)
    if os.path.exists(cwd_candidate):
        return cwd_candidate

    # 5. Relative to this source file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.join(base_dir, *subpaths)
    if os.path.exists(candidate):
        return candidate

    # 6. Relative to project root
    root_candidate = os.path.join(PROJECT_ROOT, *subpaths)
    if os.path.exists(root_candidate):
        return root_candidate

    return os.path.join(base_dir, *subpaths)

# Resolve samples directory
SAMPLES_DIR = get_resource_path("samples")
if not os.path.exists(SAMPLES_DIR):
    SAMPLES_DIR = os.path.join(PROJECT_ROOT, "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)

# Resolve model path
model_env = os.environ.get("PCB_MODEL_PATH")
if model_env and os.path.exists(model_env):
    DEFAULT_CHECKPOINT = model_env
else:
    candidate_model = get_resource_path("models", "pcb_best.pt")
    if not os.path.exists(candidate_model):
        candidate_model = get_resource_path("backend", "models", "pcb_best.pt")
    DEFAULT_CHECKPOINT = candidate_model

print(f"[PCB Backend] Using model checkpoint: {DEFAULT_CHECKPOINT} (exists: {os.path.exists(DEFAULT_CHECKPOINT)})")
print(f"[PCB Backend] Using samples directory: {SAMPLES_DIR}")
model_service = ModelService(DEFAULT_CHECKPOINT if os.path.exists(DEFAULT_CHECKPOINT) else None)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PCB Inspector API",
        "version": "1.0.0",
        "model_loaded": model_service.is_loaded
    }

@app.get("/model/status")
def get_model_status():
    return model_service.get_status()

class LoadModelRequest(BaseModel):
    weights_path: str

@app.post("/model/load")
def load_model_weights(req: LoadModelRequest):
    success, msg = model_service.load_model(req.weights_path)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {
        "success": True,
        "message": msg,
        "status": model_service.get_status()
    }

@app.post("/model/unload")
def unload_model_weights():
    res = model_service.unload_model()
    return {
        "success": True,
        "message": res["message"],
        "status": model_service.get_status()
    }

class ConfigModelRequest(BaseModel):
    conf_threshold: Optional[float] = None
    iou_threshold: Optional[float] = None

@app.post("/model/config")
def update_model_config(req: ConfigModelRequest):
    res = model_service.set_config(conf=req.conf_threshold, iou=req.iou_threshold)
    return {
        "success": True,
        "config": res
    }

@app.post("/detect")
async def detect_pcb_defects(
    file: UploadFile = File(...),
    confidence_threshold: Optional[float] = Form(None),
    iou_threshold: Optional[float] = Form(None)
):
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "MODEL_NOT_LOADED",
                "message": f"{model_service.load_error or 'No trained PCB model loaded. Please select your Google Colab trained checkpoint (.pt) in Model Manager.'}"
            }
        )

    filename = file.filename or "pcb_sample.jpg"
    try:
        contents = await file.read()
        if not contents or len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Run real YOLO inference
        result = model_service.predict(
            image_bytes=contents,
            conf_override=confidence_threshold,
            iou_override=iou_threshold
        )

        # Determine inspection status based on model verification and detections
        is_verified = model_service.is_verified_pcb_model()
        defect_count = result["defect_count"]
        if not is_verified:
            status = "Unverified"
        elif defect_count > 0:
            status = "Review Required"
        else:
            status = "Completed"

        # Save to SQLite database
        inspection_id = save_inspection(
            filename=filename,
            width=result["image_width"],
            height=result["image_height"],
            inference_time_ms=result["inference_time_ms"],
            model_name=result["model_name"],
            conf_thresh=result["confidence_threshold"],
            iou_thresh=result["iou_threshold"],
            detections=result["detections"],
            status=status,
            orig_bytes=result.pop("_orig_bytes", None),
            annot_bytes=result.pop("_annot_bytes", None)
        )

        result["inspection_id"] = inspection_id
        result["filename"] = filename
        result["status"] = status

        return {
            "success": True,
            "data": result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=f"Image error: {str(ve)}")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.get("/history")
def list_history(limit: int = 50, offset: int = 0):
    records = get_history(limit=limit, offset=offset)
    return {
        "success": True,
        "count": len(records),
        "records": records
    }

@app.get("/history/{inspection_id}")
def get_inspection(inspection_id: int):
    record = get_inspection_details(inspection_id)
    if not record:
        raise HTTPException(status_code=404, detail="Inspection not found.")
    return {
        "success": True,
        "data": record
    }

@app.delete("/history/{inspection_id}")
def remove_inspection(inspection_id: int):
    delete_inspection(inspection_id)
    return {"success": True, "message": "Inspection removed."}

@app.post("/history/clear")
def clear_history():
    clear_all_history()
    return {"success": True, "message": "All history cleared."}

@app.get("/stats")
def get_stats():
    return {
        "success": True,
        "stats": get_statistics()
    }

@app.get("/samples")
def list_samples():
    """List sample PCB images available for testing."""
    samples = []
    if os.path.exists(SAMPLES_DIR):
        for f in os.listdir(SAMPLES_DIR):
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                # Determine likely defect label from filename
                lower = f.lower()
                defect_hint = "normal"
                for cls_name in STANDARD_PCB_CLASSES:
                    if cls_name in lower or cls_name.replace("_", "") in lower:
                        defect_hint = cls_name
                        break
                samples.append({
                    "filename": f,
                    "defect_hint": defect_hint,
                    "url": f"/samples/{f}"
                })
    return {
        "success": True,
        "samples": samples
    }

@app.get("/samples/{filename}")
def get_sample_image(filename: str):
    file_path = os.path.join(SAMPLES_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample image not found.")
    return FileResponse(file_path)

@app.get("/storage/{filename}")
def get_stored_image(filename: str):
    file_path = os.path.join(STORAGE_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Stored image not found.")
    return FileResponse(file_path)

@app.get("/export/csv")
def export_csv():
    records = get_history(limit=1000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Timestamp", "Filename", "Status", "Resolution", "Defect Count",
        "Inference Time (ms)", "Model", "Confidence Threshold", "Defect Breakdown"
    ])
    for r in records:
        writer.writerow([
            r["id"],
            r["timestamp"],
            r["filename"],
            r.get("status", "Unverified"),
            f"{r['image_width']}x{r['image_height']}",
            r["defect_count"],
            r["inference_time_ms"],
            r["model_name"],
            r["confidence_threshold"],
            json.dumps(r["summary"])
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pcb_inspection_report.csv"}
    )

@app.get("/export/json")
def export_json():
    records = get_history(limit=1000)
    return JSONResponse(
        content={
            "exported_at": os.environ.get("TIMESTAMP", "current"),
            "total_records": len(records),
            "inspections": records
        },
        headers={"Content-Disposition": "attachment; filename=pcb_inspection_report.json"}
    )

if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description="PCB Inspector AI Backend")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", 8000)), help="Port to listen on")
    parser.add_argument("--host", type=str, default=os.environ.get("HOST", "127.0.0.1"), help="Host to bind")
    args, _ = parser.parse_known_args()

    print(f"[PCB Backend] Starting HTTP service on http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, reload=False)
