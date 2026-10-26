"""Real person detection on a video file or the webcam (YOLOv8 Nano + OpenCV).

Everything heavy is imported inside the thread, so the rest of the backend
still starts if ultralytics or OpenCV are not installed. In that case
`error` explains why and the engine keeps simulating that camera.
"""
import logging
import threading
import time

log = logging.getLogger("railkavach.live")


class LiveSource:
    def __init__(self, source, model_path="yolov8n.pt", conf=0.35, infer_fps=6.0, label="CAM-01"):
        self.source = source
        self.model_path = model_path
        self.conf = conf
        self.infer_fps = max(1.0, infer_fps)
        self.label = label
        self.count = 0
        self.fps = 0.0
        self.jpeg = None
        self.error = None
        self.ready = False
        self._running = False
        self._thread = None

    # used by the engine
    def usable(self):
        return self.ready and self.error is None

    def snapshot(self):
        return self.count, self.fps

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._run, name="live-detector", daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _run(self):
        try:
            import cv2
            from ultralytics import YOLO
        except Exception as exc:
            self.error = f"ultralytics/opencv not available: {exc}"
            log.warning(self.error)
            return
        try:
            model = YOLO(self.model_path)
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
        log.info("Live detection started on %s", self.source)

        boxes, last_infer, failures = [], 0.0, 0
        while self._running:
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

            if t0 - last_infer >= 1.0 / self.infer_fps:
                try:
                    res = model.predict(frame, classes=[0], conf=self.conf, imgsz=640, verbose=False)[0]
                    boxes = [
                        (int(x1), int(y1), int(x2), int(y2), float(c))
                        for (x1, y1, x2, y2), c in zip(res.boxes.xyxy.tolist(), res.boxes.conf.tolist())
                    ]
                except Exception as exc:
                    self.error = f"detection failed: {exc}"
                    log.warning(self.error)
                    break
                dt = t0 - last_infer if last_infer else 0
                if dt > 0:
                    inst = 1.0 / dt
                    self.fps = inst if self.fps == 0 else 0.8 * self.fps + 0.2 * inst
                last_infer = t0
                self.count = len(boxes)
                self.ready = True

            for x1, y1, x2, y2, c in boxes:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (80, 220, 120), 2)
                cv2.putText(frame, f"person {c:.2f}", (x1, max(14, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 220, 120), 1)
            cv2.putText(frame, f"{self.label}  COUNT {self.count}", (12, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            h, w = frame.shape[:2]
            if w > 960:
                frame = cv2.resize(frame, (960, int(h * 960 / w)))
            ok2, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if ok2:
                self.jpeg = buf.tobytes()

            if is_file:  # play files at their own speed
                spare = 1.0 / src_fps - (time.time() - t0)
                if spare > 0:
                    time.sleep(spare)
        cap.release()
        self.ready = False
