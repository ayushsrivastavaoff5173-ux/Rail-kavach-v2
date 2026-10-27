"""Real person detection on a video file or the webcam (YOLOv8 Nano + OpenCV).

Two threads per source, so the picture never waits for the model:
  * display thread: plays the video at its own speed, draws the latest boxes, makes the JPEG for streaming
  * detection thread: takes the newest frame, runs YOLO, publishes count + boxes

Detection of all cameras shares one lock, so several videos do not fight for the CPU.
Everything heavy is imported inside the thread, so the rest of the backend still starts
if ultralytics or OpenCV are not installed. In that case `error` says why and the
engine keeps simulating that camera.
"""
import logging
import os
import threading
import time

log = logging.getLogger("railkavach.live")

_INFER_LOCK = threading.Lock()  # one YOLO prediction at a time across all cameras


def _imgsz() -> int:
    try:
        return int(os.getenv("IMGSZ", "480"))
    except ValueError:
        return 480


class LiveSource:
    def __init__(self, source, model_path="yolov8n.pt", conf=0.35, infer_fps=6.0, label="CAM-01"):
        self.source = source
        self.model_path = model_path
        self.conf = conf
        self.infer_fps = max(0.5, infer_fps)
        self.label = label
        self.count = 0
        self.fps = 0.0          # how fast the picture is playing
        self.detect_fps = 0.0   # how often detection runs
        self.jpeg = None
        self.error = None
        self.ready = False
        self._running = False
        self._boxes = []
        self._want = False      # detection thread asks for a fresh frame
        self._latest = None     # frame copy handed to the detection thread
        self._model = None
        self._thread = None

    # used by the engine
    def usable(self):
        return self.ready and self.error is None

    def snapshot(self):
        return self.count, self.fps

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._run, name=f"live-{self.label}", daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    # ---------- detection thread ----------
    def _infer_loop(self):
        interval = 1.0 / self.infer_fps
        last_start = 0.0
        imgsz = _imgsz()
        while self._running and self.error is None:
            wait = interval - (time.time() - last_start)
            if wait > 0:
                time.sleep(wait)
            last_start = time.time()
            self._want = True
            frame = None
            for _ in range(200):  # wait up to ~2 s for the display thread to hand a frame over
                if not self._running:
                    return
                frame = self._latest
                if frame is not None:
                    break
                time.sleep(0.01)
            if frame is None:
                continue
            self._latest = None
            try:
                with _INFER_LOCK:
                    res = self._model.predict(frame, classes=[0], conf=self.conf, imgsz=imgsz, verbose=False)[0]
                boxes = [
                    (int(x1), int(y1), int(x2), int(y2), float(c))
                    for (x1, y1, x2, y2), c in zip(res.boxes.xyxy.tolist(), res.boxes.conf.tolist())
                ]
            except Exception as exc:
                self.error = f"detection failed: {exc}"
                log.warning(self.error)
                return
            took = time.time() - last_start
            if took > 0:
                inst = 1.0 / took
                self.detect_fps = inst if self.detect_fps == 0 else 0.8 * self.detect_fps + 0.2 * inst
            self._boxes = boxes
            self.count = len(boxes)
            self.ready = True

    # ---------- display thread ----------
    def _run(self):
        try:
            import cv2
            from ultralytics import YOLO
        except Exception as exc:
            self.error = f"ultralytics/opencv not available: {exc}"
            log.warning(self.error)
            return
        try:
            self._model = YOLO(self.model_path)
        except Exception as exc:
            self.error = f"could not load model {self.model_path}: {exc}"
            log.warning(self.error)
            return

        is_file = isinstance(self.source, str)
        cap = cv2.VideoCapture(self.source)
        if not cap.isOpened():
            self.error = f"could not open source: {self.source}"
            log.warning(self.error)
            return
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        if src_fps > 40 or src_fps < 5:
            src_fps = 25.0
        log.info("Live detection started on %s", self.source)

        threading.Thread(target=self._infer_loop, name=f"detect-{self.label}", daemon=True).start()

        failures = 0
        last_frame_t = 0.0
        while self._running and self.error is None:
            t0 = time.time()
            ok, frame = cap.read()
            if not ok:
                failures += 1
                if failures > 50:
                    self.error = "video source stopped returning frames"
                    log.warning(self.error)
                    break
                if is_file:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # loop the clip
                else:
                    time.sleep(0.1)
                continue
            failures = 0

            if self._want:  # hand a copy to the detection thread
                self._latest = frame.copy()
                self._want = False

            for x1, y1, x2, y2, c in self._boxes:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (80, 220, 120), 2)
                cv2.putText(frame, f"person {c:.2f}", (x1, max(14, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 220, 120), 1)
            cv2.putText(frame, f"{self.label}  COUNT {self.count}", (12, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            h, w = frame.shape[:2]
            if w > 960:
                frame = cv2.resize(frame, (960, int(h * 960 / w)))
            ok2, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if ok2:
                self.jpeg = buf.tobytes()

            now = time.time()
            if last_frame_t:
                inst = 1.0 / max(1e-3, now - last_frame_t)
                self.fps = inst if self.fps == 0 else 0.9 * self.fps + 0.1 * inst
            last_frame_t = now

            if is_file:  # play files at their own speed
                spare = 1.0 / src_fps - (time.time() - t0)
                if spare > 0:
                    time.sleep(spare)
        cap.release()
        self.ready = False
