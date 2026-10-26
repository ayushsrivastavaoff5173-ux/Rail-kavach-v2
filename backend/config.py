"""Settings for the RailKavach backend. Everything can be changed from backend/.env."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

try:  # python-dotenv is optional
    from dotenv import load_dotenv

    load_dotenv(BASE_DIR / ".env")
except Exception:
    pass


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except ValueError:
        return default


# simulator  -> no camera or model needed (default, safest for a demo)
# video      -> run YOLOv8 on a recorded video file for one camera node
# webcam     -> run YOLOv8 on the laptop camera for one camera node
SOURCE = os.getenv("SOURCE", "simulator").strip().lower()

VIDEO_PATH = os.getenv("VIDEO_PATH", "videos/normal_flow.mp4")
WEBCAM_INDEX = _int("WEBCAM_INDEX", 0)
MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")
CONFIDENCE = _float("CONFIDENCE", 0.35)
INFER_FPS = _float("INFER_FPS", 6)

# Which camera node shows the real detection, and how many people count as 100% density.
LIVE_NODE_ID = os.getenv("LIVE_NODE_ID", "cam-1")
LIVE_MAX_CAPACITY = _int("LIVE_MAX_CAPACITY", 30)

TICK_SECONDS = _float("TICK_SECONDS", 1.0)
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]


def resolve_video_path(path: str = "") -> str:
    p = Path(path or VIDEO_PATH)
    return str(p if p.is_absolute() else BASE_DIR / p)


def live_videos() -> dict:
    """node id -> video path. VIDEO_CAM1..VIDEO_CAM4 in .env; falls back to VIDEO_PATH on LIVE_NODE_ID."""
    out = {}
    for i in range(1, 5):
        v = os.getenv(f"VIDEO_CAM{i}", "").strip()
        if v:
            out[f"cam-{i}"] = v
    if not out:
        out[LIVE_NODE_ID] = VIDEO_PATH
    return out
