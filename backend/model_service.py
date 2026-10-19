import os
import cv2
import numpy as np
import base64
import time
import torch
from typing import Dict, Any, List, Optional, Tuple
from ultralytics import YOLO

# Standard PCB Defect taxonomy
STANDARD_PCB_CLASSES = [
    "missing_hole",
    "mouse_bite",
    "open_circuit",
    "short",
    "spur",
    "spurious_copper"
]

# High-contrast industrial defect color map (RGB) - Signal Red and precise machine vision indicators
CLASS_COLORS = {
    "missing_hole": (220, 32, 17),       # Bright Signal Red (#DC2011)
    "mouse_bite": (235, 155, 30),        # Industrial Amber Gold
    "open_circuit": (245, 80, 50),       # High-visibility Coral Red
    "short": (143, 11, 19),             # Primary Crimson (#8F0B13)
    "spur": (210, 125, 45),              # Copper Ochre
    "spurious_copper": (35, 195, 120),   # Distinct Mint Green
    "default": (220, 32, 17)             # Bright Signal Red
}

class ModelService:
    def __init__(self, explicit_weights_path: Optional[str] = None):
        self.weights_path: Optional[str] = None
        self.model: Optional[YOLO] = None
        self.device: str = "cuda" if torch.cuda.is_available() else "cpu"
        self.conf_threshold: float = 0.25
        self.iou_threshold: float = 0.45
        self.is_loaded: bool = False
        self.load_error: Optional[str] = "No trained PCB model loaded. Please select your Google Colab trained PCB defect model (.pt) checkpoint."
        self.supported_classes: List[str] = STANDARD_PCB_CLASSES
        self.model_class_names: Dict[int, str] = {}
        self.model_info: Dict[str, Any] = {}

        # Strictly load ONLY if an explicit, valid path was provided by the user
        if explicit_weights_path and os.path.exists(explicit_weights_path):
            self.load_model(explicit_weights_path)

    def load_model(self, weights_path: str) -> Tuple[bool, str]:
        """Loads user-trained PCB defect weights from local file path."""
        if not weights_path or not os.path.exists(weights_path):
            self.is_loaded = False
            self.model = None
            self.load_error = f"Model checkpoint not found at: '{weights_path}'"
            return False, self.load_error

        try:
            # Load user's trained YOLO model checkpoint (no downloads)
            model = YOLO(weights_path)
            self.model = model
            self.weights_path = os.path.abspath(weights_path)
            self.is_loaded = True
            self.load_error = None
            
            # Extract classes
            if hasattr(model, "names") and model.names:
                self.model_class_names = model.names
                self.supported_classes = list(model.names.values())
            else:
                self.supported_classes = STANDARD_PCB_CLASSES

            file_stat = os.stat(weights_path)
            self.model_info = {
                "name": os.path.basename(weights_path),
                "path": self.weights_path,
                "file_size_mb": round(file_stat.st_size / (1024 * 1024), 2),
                "device": self.device,
                "classes_count": len(self.supported_classes),
                "classes": self.supported_classes,
                "type": getattr(model, "task", "detect")
            }
            return True, "Model loaded successfully."
        except Exception as e:
            self.is_loaded = False
            self.model = None
            self.load_error = f"Failed to load weights: {str(e)}"
            return False, self.load_error

    def unload_model(self) -> Dict[str, Any]:
        """Unloads the active model and releases resources."""
        self.model = None
        self.weights_path = None
        self.is_loaded = False
        self.model_info = {}
        self.model_class_names = {}
        self.supported_classes = STANDARD_PCB_CLASSES
        self.load_error = "No trained PCB model loaded. Please select your Google Colab trained PCB defect model (.pt) checkpoint."
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        return {"success": True, "message": "Model unloaded successfully."}

    def is_verified_pcb_model(self) -> bool:
        """Checks if the loaded checkpoint represents a genuine PCB defect model."""
        if not self.is_loaded or not self.supported_classes:
            return False
        # Generic COCO models have typical common objects
        coco_sample = {"person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "cat", "dog"}
        classes_lower = set(str(c).lower() for c in self.supported_classes)
        if classes_lower.intersection(coco_sample):
            return False
        # Matches standard PCB defect classes or custom defect taxonomy
        pcb_indicators = {"missing_hole", "mouse_bite", "open_circuit", "short", "spur", "spurious_copper", "pcb", "defect"}
        if any(cls in classes_lower for cls in pcb_indicators):
            return True
        return True

    def get_status(self) -> Dict[str, Any]:
        return {
            "loaded": self.is_loaded,
            "weights_path": self.weights_path,
            "device": self.device,
            "cuda_available": torch.cuda.is_available(),
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
            "conf_threshold": self.conf_threshold,
            "iou_threshold": self.iou_threshold,
            "supported_classes": self.supported_classes,
            "is_pcb_model": self.is_verified_pcb_model(),
            "load_error": self.load_error,
            "model_info": self.model_info if self.is_loaded else None
        }

    def set_config(self, conf: Optional[float] = None, iou: Optional[float] = None) -> Dict[str, Any]:
        if conf is not None:
            self.conf_threshold = max(0.01, min(1.0, float(conf)))
        if iou is not None:
            self.iou_threshold = max(0.01, min(1.0, float(iou)))
        return {
            "conf_threshold": self.conf_threshold,
            "iou_threshold": self.iou_threshold
        }

    def predict(
        self,
        image_bytes: bytes,
        conf_override: Optional[float] = None,
        iou_override: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Runs real YOLO inference on image bytes.
        Never fabricates detection data.
        Returns detections, timings, and annotated image.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError(
                "Cannot run detection: No trained PCB model loaded. Please select your Google Colab trained PCB defect model (.pt) checkpoint in Model Manager."
            )

        conf = conf_override if conf_override is not None else self.conf_threshold
        iou = iou_override if iou_override is not None else self.iou_threshold

        # Decode image from bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError("Invalid image file: Failed to decode image bytes.")

        orig_height, orig_width = img_bgr.shape[:2]

        # Execute genuine YOLO inference
        start_time = time.perf_counter()
        results = self.model.predict(
            img_bgr,
            conf=conf,
            iou=iou,
            device=self.device,
            verbose=False
        )
        end_time = time.perf_counter()
        inference_time_ms = round((end_time - start_time) * 1000, 2)

        detections: List[Dict[str, Any]] = []
        annotated_bgr = img_bgr.copy()

        # Parse detections from Ultralytics Results object
        if results and len(results) > 0:
            result = results[0]
            boxes = result.boxes
            if boxes is not None and len(boxes) > 0:
                for idx, box in enumerate(boxes):
                    xyxy = box.xyxy[0].cpu().numpy().tolist()
                    confidence = float(box.conf[0].cpu().numpy())
                    cls_id = int(box.cls[0].cpu().numpy())
                    
                    # Resolve class name
                    class_name = self.model_class_names.get(cls_id, f"defect_{cls_id}")
                    # Format coordinates
                    x1, y1, x2, y2 = xyxy
                    x1 = max(0, min(orig_width, x1))
                    y1 = max(0, min(orig_height, y1))
                    x2 = max(0, min(orig_width, x2))
                    y2 = max(0, min(orig_height, y2))
                    
                    bbox_width = x2 - x1
                    bbox_height = y2 - y1

                    detections.append({
                        "id": idx + 1,
                        "class_name": class_name,
                        "confidence": round(confidence, 4),
                        "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
                        "width": round(bbox_width, 1),
                        "height": round(bbox_height, 1),
                        "area": round(bbox_width * bbox_height, 1)
                    })

                    # Draw clean, professional industrial annotations
                    # Choose color based on class
                    color_rgb = CLASS_COLORS.get(class_name.lower(), CLASS_COLORS["default"])
                    color_bgr = (color_rgb[2], color_rgb[1], color_rgb[0])

                    ix1, iy1, ix2, iy2 = int(x1), int(y1), int(x2), int(y2)
                    
                    # Semi-transparent bounding overlay
                    overlay = annotated_bgr.copy()
                    cv2.rectangle(overlay, (ix1, iy1), (ix2, iy2), color_bgr, -1)
                    cv2.addWeighted(overlay, 0.12, annotated_bgr, 0.88, 0, annotated_bgr)

                    # High-visibility outer bounding box border
                    min_dim = min(orig_width, orig_height)
                    thickness = max(2, min(4, int(min_dim / 700)))
                    cv2.rectangle(annotated_bgr, (ix1, iy1), (ix2, iy2), color_bgr, thickness)

                    # Defect Badge tag: compact, legible, clamped to image borders
                    formatted_class = class_name.replace('_', ' ').upper()
                    label = f"#{idx+1} {formatted_class} {int(confidence * 100)}%"
                    font_scale = max(0.38, min(0.58, min_dim / 2800))
                    font_thickness = 1 if font_scale < 0.52 else 2
                    (tw, th), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thickness)
                    
                    pad_x = 5
                    pad_y = 3
                    badge_w = tw + pad_x * 2
                    badge_h = th + pad_y * 2

                    # Horizontal clamping
                    badge_x1 = ix1
                    if badge_x1 + badge_w > orig_width:
                        badge_x1 = max(0, orig_width - badge_w)
                    badge_x2 = min(orig_width, badge_x1 + badge_w)

                    # Vertical placement: prefer above, then below, then inside box
                    if iy1 - badge_h >= 0:
                        badge_y1 = iy1 - badge_h
                        badge_y2 = iy1
                        text_y = iy1 - pad_y
                    elif iy2 + badge_h <= orig_height:
                        badge_y1 = iy2
                        badge_y2 = iy2 + badge_h
                        text_y = iy2 + badge_h - pad_y
                    else:
                        badge_y1 = max(0, iy1)
                        badge_y2 = min(orig_height, badge_y1 + badge_h)
                        text_y = badge_y1 + badge_h - pad_y

                    text_x = badge_x1 + pad_x

                    # Background for badge
                    cv2.rectangle(annotated_bgr, (badge_x1, badge_y1), (badge_x2, badge_y2), color_bgr, -1)
                    # Text inside badge
                    text_color = (255, 255, 255) if sum(color_bgr) < 480 else (15, 15, 15)
                    cv2.putText(
                        annotated_bgr,
                        label,
                        (text_x, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        font_scale,
                        text_color,
                        font_thickness,
                        cv2.LINE_AA
                    )


        # Encode images to JPEG
        _, orig_encoded = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
        _, annot_encoded = cv2.imencode(".jpg", annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])

        orig_bytes_out = orig_encoded.tobytes()
        annot_bytes_out = annot_encoded.tobytes()

        orig_b64 = base64.b64encode(orig_bytes_out).decode("utf-8")
        annot_b64 = base64.b64encode(annot_bytes_out).decode("utf-8")

        # Summary counts
        defect_counts: Dict[str, int] = {}
        for d in detections:
            c = d["class_name"]
            defect_counts[c] = defect_counts.get(c, 0) + 1

        return {
            "defect_count": len(detections),
            "detections": detections,
            "defect_summary": defect_counts,
            "inference_time_ms": inference_time_ms,
            "image_width": orig_width,
            "image_height": orig_height,
            "model_name": self.model_info.get("name", "Unknown"),
            "confidence_threshold": conf,
            "iou_threshold": iou,
            "original_image_base64": f"data:image/jpeg;base64,{orig_b64}",
            "annotated_image_base64": f"data:image/jpeg;base64,{annot_b64}",
            "_orig_bytes": orig_bytes_out,
            "_annot_bytes": annot_bytes_out
        }
