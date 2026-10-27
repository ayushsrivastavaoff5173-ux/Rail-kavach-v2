"""POST /api/detect  - person detection on one JPEG frame sent by the browser (laptop webcam).

The browser sends raw JPEG bytes, we reply with the person count and boxes
(coordinates are 0..1, so the page can draw them at any size).
Frames are processed in memory only. Nothing is saved, no faces are recognised.
"""
import asyncio
import threading

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

import config

router = APIRouter()

_model = None
_model_lock = threading.Lock()
_predict_lock = threading.Lock()


def _get_model():
    global _model
    with _model_lock:
        if _model is None:
            from ultralytics import YOLO

            _model = YOLO(config.MODEL_PATH)
        return _model


def detect_jpeg(data: bytes, model=None) -> dict:
    """Decode a JPEG and return {count, boxes:[[x1,y1,x2,y2,conf]...], width, height}."""
    import cv2
    import numpy as np

    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("could not decode image")
    h, w = img.shape[:2]
    model = model or _get_model()
    with _predict_lock:
        res = model.predict(img, classes=[0], conf=config.CONFIDENCE, imgsz=640, verbose=False)[0]
    boxes = []
    for (x1, y1, x2, y2), c in zip(res.boxes.xyxy.tolist(), res.boxes.conf.tolist()):
        boxes.append([round(x1 / w, 4), round(y1 / h, 4), round(x2 / w, 4), round(y2 / h, 4), round(float(c), 2)])
    return {"count": len(boxes), "boxes": boxes, "width": w, "height": h}


@router.post("/api/detect")
async def detect(request: Request):
    data = await request.body()
    if not data:
        return JSONResponse({"error": "empty body"}, status_code=400)
    try:
        return await asyncio.to_thread(detect_jpeg, data)
    except ImportError as exc:
        return JSONResponse({"error": f"vision libraries missing: {exc}"}, status_code=503)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    except Exception as exc:
        return JSONResponse({"error": f"detection failed: {exc}"}, status_code=500)
