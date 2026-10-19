import sqlite3
import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

# Resolve database and storage directories (respects per-user data directory in production)
USER_DATA_DIR = os.environ.get("PCB_USER_DATA_DIR")
if USER_DATA_DIR:
    DB_DIR = os.path.join(USER_DATA_DIR, "data")
else:
    DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

DB_PATH = os.path.join(DB_DIR, "pcb_inspections.db")
STORAGE_DIR = os.path.join(DB_DIR, "storage")

os.makedirs(DB_DIR, exist_ok=True)
os.makedirs(STORAGE_DIR, exist_ok=True)

# Migrate existing dev database if running with user data dir for the first time
if USER_DATA_DIR and not os.path.exists(DB_PATH):
    dev_db = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "pcb_inspections.db")
    if os.path.exists(dev_db):
        try:
            import shutil
            shutil.copy2(dev_db, DB_PATH)
            dev_storage = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "storage")
            if os.path.exists(dev_storage):
                for fname in os.listdir(dev_storage):
                    s_file = os.path.join(dev_storage, fname)
                    d_file = os.path.join(STORAGE_DIR, fname)
                    if os.path.isfile(s_file) and not os.path.exists(d_file):
                        shutil.copy2(s_file, d_file)
        except Exception as _e:
            pass

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        filename TEXT NOT NULL,
        image_width INTEGER NOT NULL,
        image_height INTEGER NOT NULL,
        defect_count INTEGER NOT NULL,
        inference_time_ms REAL NOT NULL,
        model_name TEXT NOT NULL,
        confidence_threshold REAL NOT NULL,
        iou_threshold REAL NOT NULL,
        original_image_path TEXT,
        annotated_image_path TEXT,
        summary_json TEXT,
        status TEXT NOT NULL DEFAULT 'Unverified'
    );
    """)

    # Check if 'status' column exists for existing installations
    cursor.execute("PRAGMA table_info(inspections)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "status" not in columns:
        cursor.execute("ALTER TABLE inspections ADD COLUMN status TEXT NOT NULL DEFAULT 'Unverified'")

    # Mark legacy generic model records (e.g. yolov8n.pt) as Unverified
    cursor.execute("""
    UPDATE inspections 
    SET status = 'Unverified' 
    WHERE (model_name = 'yolov8n.pt' OR model_name = 'Unknown' OR model_name LIKE '%yolov8n%')
      AND (status IS NULL OR status = '' OR status = 'Passed' OR status = 'Completed')
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS defect_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inspection_id INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        confidence REAL NOT NULL,
        bbox_x1 REAL NOT NULL,
        bbox_y1 REAL NOT NULL,
        bbox_x2 REAL NOT NULL,
        bbox_y2 REAL NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id) ON DELETE CASCADE
    );
    """)
    conn.commit()
    conn.close()

def save_inspection(
    filename: str,
    width: int,
    height: int,
    inference_time_ms: float,
    model_name: str,
    conf_thresh: float,
    iou_thresh: float,
    detections: List[Dict[str, Any]],
    status: str = "Completed",
    orig_bytes: Optional[bytes] = None,
    annot_bytes: Optional[bytes] = None
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    
    # Save images to storage directory
    orig_rel_path = None
    annot_rel_path = None
    file_id_prefix = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}_{os.path.splitext(os.path.basename(filename))[0]}"
    
    if orig_bytes:
        orig_filename = f"{file_id_prefix}_orig.jpg"
        orig_full_path = os.path.join(STORAGE_DIR, orig_filename)
        with open(orig_full_path, "wb") as f:
            f.write(orig_bytes)
        orig_rel_path = orig_filename
        
    if annot_bytes:
        annot_filename = f"{file_id_prefix}_annot.jpg"
        annot_full_path = os.path.join(STORAGE_DIR, annot_filename)
        with open(annot_full_path, "wb") as f:
            f.write(annot_bytes)
        annot_rel_path = annot_filename

    # Count by defect category
    summary = {}
    for d in detections:
        c = d.get("class_name", "unknown")
        summary[c] = summary.get(c, 0) + 1

    cursor.execute("""
    INSERT INTO inspections (
        timestamp, filename, image_width, image_height, defect_count,
        inference_time_ms, model_name, confidence_threshold, iou_threshold,
        original_image_path, annotated_image_path, summary_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        now_str,
        filename,
        width,
        height,
        len(detections),
        round(inference_time_ms, 2),
        model_name,
        conf_thresh,
        iou_thresh,
        orig_rel_path,
        annot_rel_path,
        json.dumps(summary),
        status
    ))
    
    inspection_id = cursor.lastrowid

    for d in detections:
        bbox = d.get("bbox", [0, 0, 0, 0])
        cursor.execute("""
        INSERT INTO defect_items (
            inspection_id, class_name, confidence,
            bbox_x1, bbox_y1, bbox_x2, bbox_y2
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            inspection_id,
            d.get("class_name", "unknown"),
            round(float(d.get("confidence", 0.0)), 4),
            round(float(bbox[0]), 2),
            round(float(bbox[1]), 2),
            round(float(bbox[2]), 2),
            round(float(bbox[3]), 2)
        ))

    conn.commit()
    conn.close()
    return inspection_id

def get_history(limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM inspections
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    """, (limit, offset))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        row_dict = dict(r)
        status = row_dict.get("status")
        # Ensure status is accurate based on model and defect count
        if not status or row_dict.get("model_name") == "yolov8n.pt":
            status = "Unverified"
        results.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "filename": r["filename"],
            "image_width": r["image_width"],
            "image_height": r["image_height"],
            "defect_count": r["defect_count"],
            "inference_time_ms": r["inference_time_ms"],
            "model_name": r["model_name"],
            "confidence_threshold": r["confidence_threshold"],
            "iou_threshold": r["iou_threshold"],
            "original_image_path": r["original_image_path"],
            "annotated_image_path": r["annotated_image_path"],
            "status": status,
            "summary": json.loads(r["summary_json"]) if r["summary_json"] else {}
        })
    conn.close()
    return results

def get_inspection_details(inspection_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inspections WHERE id = ?", (inspection_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    cursor.execute("SELECT * FROM defect_items WHERE inspection_id = ?", (inspection_id,))
    item_rows = cursor.fetchall()
    
    detections = []
    for item in item_rows:
        detections.append({
            "id": item["id"],
            "class_name": item["class_name"],
            "confidence": item["confidence"],
            "bbox": [item["bbox_x1"], item["bbox_y1"], item["bbox_x2"], item["bbox_y2"]]
        })
    
    row_dict = dict(row)
    status = row_dict.get("status")
    if not status or row_dict.get("model_name") == "yolov8n.pt":
        status = "Unverified"

    result = {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "filename": row["filename"],
        "image_width": row["image_width"],
        "image_height": row["image_height"],
        "defect_count": row["defect_count"],
        "inference_time_ms": row["inference_time_ms"],
        "model_name": row["model_name"],
        "confidence_threshold": row["confidence_threshold"],
        "iou_threshold": row["iou_threshold"],
        "original_image_path": row["original_image_path"],
        "annotated_image_path": row["annotated_image_path"],
        "status": status,
        "summary": json.loads(row["summary_json"]) if row["summary_json"] else {},
        "detections": detections
    }
    conn.close()
    return result

def delete_inspection(inspection_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT original_image_path, annotated_image_path FROM inspections WHERE id = ?", (inspection_id,))
    row = cursor.fetchone()
    if row:
        for path_key in ["original_image_path", "annotated_image_path"]:
            rel = row[path_key]
            if rel:
                full_path = os.path.join(STORAGE_DIR, rel)
                if os.path.exists(full_path):
                    try:
                        os.remove(full_path)
                    except Exception:
                        pass
    cursor.execute("DELETE FROM defect_items WHERE inspection_id = ?", (inspection_id,))
    cursor.execute("DELETE FROM inspections WHERE id = ?", (inspection_id,))
    conn.commit()
    conn.close()
    return True

def clear_all_history() -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM defect_items")
    cursor.execute("DELETE FROM inspections")
    conn.commit()
    conn.close()
    # Clean storage files
    for f in os.listdir(STORAGE_DIR):
        try:
            os.remove(os.path.join(STORAGE_DIR, f))
        except Exception:
            pass
    return True

def get_statistics() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS total FROM inspections")
    total_inspections = cursor.fetchone()["total"]
    
    if total_inspections == 0:
        conn.close()
        return {
            "total_inspections": 0,
            "valid_inspections": 0,
            "unverified_inspections": 0,
            "defective_pcbs": 0,
            "clean_pcbs": 0,
            "defect_rate_percentage": 0.0,
            "total_defects_found": 0,
            "total_defects_valid": 0,
            "avg_inference_time_ms": 0.0,
            "defects_by_class": {},
            "recent_inspections": []
        }
    
    # Valid inspections: where status is Completed or Review Required and not yolov8n.pt generic model
    cursor.execute("""
    SELECT COUNT(*) AS valid_cnt 
    FROM inspections 
    WHERE status IN ('Completed', 'Review Required') AND model_name != 'yolov8n.pt'
    """)
    valid_inspections = cursor.fetchone()["valid_cnt"]
    unverified_inspections = total_inspections - valid_inspections

    cursor.execute("""
    SELECT COUNT(*) AS defective_cnt 
    FROM inspections 
    WHERE status = 'Review Required' OR (defect_count > 0 AND status != 'Unverified')
    """)
    defective_pcbs = cursor.fetchone()["defective_cnt"]
    clean_pcbs = max(0, valid_inspections - defective_pcbs)
    defect_rate = round((defective_pcbs / valid_inspections) * 100, 1) if valid_inspections > 0 else 0.0

    # Total defects from valid inspections
    cursor.execute("""
    SELECT SUM(defect_count) AS total_valid_defects 
    FROM inspections 
    WHERE status IN ('Completed', 'Review Required') AND model_name != 'yolov8n.pt'
    """)
    agg_valid = cursor.fetchone()
    total_defects_valid = agg_valid["total_valid_defects"] or 0

    # Total defects overall
    cursor.execute("SELECT SUM(defect_count) AS total_defects, AVG(inference_time_ms) AS avg_time FROM inspections")
    agg = cursor.fetchone()
    total_defects = agg["total_defects"] or 0
    avg_time = round(agg["avg_time"] or 0.0, 1)

    # Defect class counts ONLY for inspections with valid defect items
    cursor.execute("""
    SELECT d.class_name, COUNT(*) AS count
    FROM defect_items d
    JOIN inspections i ON d.inspection_id = i.id
    WHERE i.model_name != 'yolov8n.pt'
    GROUP BY d.class_name
    ORDER BY count DESC
    """)
    class_rows = cursor.fetchall()
    defects_by_class = {r["class_name"]: r["count"] for r in class_rows}

    # Latest 5 inspections with full metadata
    cursor.execute("""
    SELECT id, timestamp, filename, defect_count, inference_time_ms, model_name, status
    FROM inspections 
    ORDER BY id DESC 
    LIMIT 5
    """)
    recent = []
    for r in cursor.fetchall():
        r_dict = dict(r)
        if not r_dict.get("status") or r_dict.get("model_name") == "yolov8n.pt":
            r_dict["status"] = "Unverified"
        recent.append(r_dict)

    conn.close()
    return {
        "total_inspections": total_inspections,
        "valid_inspections": valid_inspections,
        "unverified_inspections": unverified_inspections,
        "defective_pcbs": defective_pcbs,
        "clean_pcbs": clean_pcbs,
        "defect_rate_percentage": defect_rate,
        "total_defects_found": total_defects,
        "total_defects_valid": total_defects_valid,
        "avg_inference_time_ms": avg_time,
        "defects_by_class": defects_by_class,
        "recent_inspections": recent
    }

# Ensure DB initialized on module load
init_db()
