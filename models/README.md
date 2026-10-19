# PCB Inspector Model Directory

This directory stores PyTorch / Ultralytics YOLO model weight files (`.pt`) for PCB defect detection.

### Supported PCB Defect Classes
Standard PCB defect classification taxonomy:
1. `missing_hole` (Holes omitted during drilling)
2. `mouse_bite` (Edge notches and substrate erosion)
3. `open_circuit` (Trace discontinuities and broken traces)
4. `short` (Unintended electrical bridges between copper tracks)
5. `spur` (Extraneous copper protrusions along conductor edges)
6. `spurious_copper` (Isolated copper islands or etch leftovers)

### How to use your trained weights:
1. Place your trained model weights here (e.g., `pcb_defect_yolov8.pt` or `best.pt`).
2. In the PCB Inspector desktop application, navigate to **Model Manager**.
3. Click **"Browse Weights"** or enter the path to load your model.
4. The system validates the model, extracts class labels, and prepares inference.

*Note: If no weights are selected, detection is disabled gracefully and no fake detections are generated.*
