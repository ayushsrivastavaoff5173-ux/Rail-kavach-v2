"""RailKavach AI backend (FastAPI).

Run from the backend folder:
    uvicorn main:app --port 8000

By default it runs a crowd simulator, so no camera, video or GPU is needed.
Set SOURCE=video or SOURCE=webcam in .env to run real YOLOv8 person counting
on one camera node (cam-1). The system counts people only: no faces, no identity.
"""
import asyncio
import contextlib
import json
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

import config
from services.engine import CrowdEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("railkavach")

engine = CrowdEngine()
clients = set()
live_sources = {}  # node id -> LiveSource


def _setup_live():
    """Start YOLO on the configured camera nodes. Any failure leaves the simulator running."""
    if config.SOURCE not in ("video", "webcam"):
        return
    try:
        from services.live import LiveSource

        if config.SOURCE == "webcam":
            jobs = {config.LIVE_NODE_ID: config.WEBCAM_INDEX}
        else:
            jobs = {node: config.resolve_video_path(p) for node, p in config.live_videos().items()}
        for node, src in jobs.items():
            ls = LiveSource(src, config.MODEL_PATH, config.CONFIDENCE, config.INFER_FPS, label=node.upper())
            engine.attach_live(node, ls, config.LIVE_MAX_CAPACITY)
            engine.set_stream_url(node, f"{config.PUBLIC_BASE_URL}/video/live/{node}")
            ls.start()
            live_sources[node] = ls
            log.info("Live detection requested on %s (%s)", node, src)
    except Exception as exc:  # never block start-up
        log.warning("Live detection disabled: %s", exc)


async def broadcast(message: dict):
    if not clients:
        return
    text = json.dumps(message)
    dead = []
    for ws in list(clients):
        try:
            await ws.send_text(text)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)


async def ticker():
    while True:
        try:
            frame, new_alerts = engine.step()
            await broadcast({"type": "telemetry", "data": frame})
            for a in new_alerts:
                await broadcast({"type": "alert", "data": a})
        except Exception:
            log.exception("tick failed")
        await asyncio.sleep(config.TICK_SECONDS)


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    _setup_live()
    task = asyncio.create_task(ticker())
    yield
    task.cancel()
    for ls in live_sources.values():
        ls.stop()


app = FastAPI(title="RailKavach AI", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    live = {n: {"running": s.usable(), "error": s.error, "count": s.count} for n, s in live_sources.items()} or None
    return {"status": "ok", "source": config.SOURCE, "scenario": engine.scenario or "auto", "clients": len(clients), "live": live}


@app.get("/api/state")
def state():
    return engine.state()


@app.post("/api/scenario/{name}")
async def scenario(name: str):
    if not engine.set_scenario(name):
        return JSONResponse({"error": "use normal, moderate, surge or auto"}, status_code=400)
    await broadcast({"type": "state", "data": engine.state()})
    return {"scenario": engine.scenario or "auto"}


@app.post("/api/simulation")
async def simulation(cfg: dict):
    engine.set_sim(cfg)
    await broadcast({"type": "state", "data": engine.state()})
    return engine.sim


@app.post("/api/alerts/{alert_id}/ack")
async def ack(alert_id: str):
    ok = engine.acknowledge(alert_id)
    await broadcast({"type": "state", "data": engine.state()})
    return {"acknowledged": ok}


@app.post("/api/reset")
async def reset():
    engine.reset()
    await broadcast({"type": "state", "data": engine.state()})
    return {"ok": True}


@app.get("/video/live")
@app.get("/video/live/{node_id}")
async def video_live(node_id: str = ""):
    live_source = live_sources.get(node_id or config.LIVE_NODE_ID)
    if not live_source or not live_source.usable():
        return JSONResponse({"error": "live detection is not running for this camera (SOURCE=simulator or still loading)"}, status_code=404)

    async def gen():
        last = None
        while True:
            frame = live_source.jpeg
            if frame is not None and frame is not last:
                last = frame
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
            await asyncio.sleep(0.05)

    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    try:
        await ws.send_text(json.dumps({"type": "state", "data": engine.state()}))
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except ValueError:
                continue
            kind = msg.get("type")
            if kind == "simulation":
                engine.set_sim(msg.get("data") or {})
            elif kind == "ack":
                engine.acknowledge(str(msg.get("id", "")))
            elif kind == "scenario":
                engine.set_scenario(str(msg.get("name", "")))
            elif kind == "reset":
                engine.reset()
            else:
                continue
            await broadcast({"type": "state", "data": engine.state()})
    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("websocket error")
    finally:
        clients.discard(ws)
