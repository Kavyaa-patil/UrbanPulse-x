import os
from pathlib import Path
from PIL import Image
from io import BytesIO

MODEL_PATH_RAW = os.getenv("ROAD_MODEL_PATH", "").strip()
CONFIDENCE = float(os.getenv("VISION_CONFIDENCE", "0.30"))
_model = None
_model_error = None

def model_status():
    if not MODEL_PATH_RAW:
        return {"configured": False, "model": None,
                "message": "ROAD_MODEL_PATH is empty. No road-hazard model is loaded; no detections will be fabricated."}
    path = Path(MODEL_PATH_RAW)
    if not path.is_absolute():
        path = Path(__file__).resolve().parents[2] / path
    if not path.exists():
        return {"configured": False, "model": str(path),
                "message": "Configured model file does not exist."}
    return {"configured": True, "model": str(path), "message": "Model file found; loading occurs on first inference."}

def get_model():
    global _model, _model_error
    if _model is not None:
        return _model
    status = model_status()
    if not status["configured"]:
        raise RuntimeError(status["message"])
    try:
        from ultralytics import YOLO
        _model = YOLO(status["model"])
        return _model
    except Exception as exc:
        _model_error = str(exc)
        raise RuntimeError(f"Could not load model: {_model_error}") from exc

def infer_image(raw: bytes, filename: str):
    try:
        image = Image.open(BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise ValueError("Uploaded file is not a valid image.") from exc
    model = get_model()
    results = model.predict(image, conf=CONFIDENCE, verbose=False)
    detections = []
    for result in results:
        names = result.names
        boxes = result.boxes
        if boxes is None:
            continue
        for box in boxes:
            cls_id = int(box.cls[0].item())
            detections.append({
                "label": str(names.get(cls_id, cls_id)),
                "confidence": round(float(box.conf[0].item()), 4),
                "xyxy": [round(float(v), 2) for v in box.xyxy[0].tolist()]
            })
    return {
        "filename": filename,
        "model": Path(MODEL_PATH_RAW).name,
        "detections": detections,
        "note": "Predictions reflect the configured model's training labels. Validate model quality before operational use."
    }
