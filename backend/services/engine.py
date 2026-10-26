"""Crowd engine: owns the camera nodes, the density maths and the alerts.

It has no web or camera code in it, so it can be tested on its own.
The data shapes match frontend/src/types/telemetry.ts exactly.
"""
import random
import time
from datetime import datetime

NODE_DEFS = [
    {"id": "cam-1", "name": "Platform 1 & 2 Main Stairs", "zone": "Platform Area", "maxCapacity": 500, "fps": 30, "resolution": "1080p"},
    {"id": "cam-2", "name": "East Concourse Entry Gate", "zone": "Concourse", "maxCapacity": 700, "fps": 28, "resolution": "1080p"},
    {"id": "cam-3", "name": "Foot Over Bridge (FOB-B)", "zone": "Overbridge", "maxCapacity": 500, "fps": 30, "resolution": "4K"},
    {"id": "cam-4", "name": "Ticket Counter Plaza", "zone": "Booking Hall", "maxCapacity": 400, "fps": 25, "resolution": "1080p"},
]

# Target density (percent of safe limit) per node for each demo scenario.
SCENARIOS = {
    "normal": {"cam-1": 52, "cam-2": 48, "cam-3": 42, "cam-4": 35},
    "moderate": {"cam-1": 72, "cam-2": 78, "cam-3": 76, "cam-4": 45},
    "surge": {"cam-1": 86, "cam-2": 91, "cam-3": 97, "cam-4": 55},
}
WEATHER_BONUS = {"CLEAR": 0, "RAIN": 4, "HEAVY_RUSH": 10}

# (density above, severity). Same limits the frontend uses for WARNING / CRITICAL.
LEVELS = [(90, "CRITICAL"), (80, "HIGH"), (70, "MEDIUM")]
RANK = {"MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
RANK_THRESHOLD = {3: 90, 2: 80, 1: 70}
ALERT_COOLDOWN_S = 25
CRITICAL_ACTIONS = "Gate B closed, PA announcement triggered, RPF team dispatched, Station Master alerted."


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def status_for(density: float) -> str:
    if density > 90:
        return "CRITICAL"
    if density > 80:
        return "WARNING"
    return "ONLINE"


def now_label() -> str:
    return datetime.now().strftime("%I:%M:%S %p")


class CrowdEngine:
    def __init__(self, seed=None):
        self.rng = random.Random(seed)
        self.sim = {"inflowRate": 120, "outflowRate": 100, "eventSpeed": 1, "weatherCondition": "CLEAR"}
        self.scenario = "normal"  # None means "follow the simulation sliders"
        self.nodes = []
        for d in NODE_DEFS:
            n = dict(d)
            n["_cap0"] = d["maxCapacity"]
            n["_fps0"] = d["fps"]
            n["density"] = float(SCENARIOS["normal"][d["id"]])
            n["currentCount"] = round(n["density"] / 100 * n["maxCapacity"])
            n["status"] = "ONLINE"
            self.nodes.append(n)
        self.alerts = []
        self.gate_b_closed = False
        self.live = {}
        self._seq = 0
        self._level = {n["id"]: 0 for n in self.nodes}
        self._last_alert = {}

    # ---------- configuration ----------
    def attach_live(self, node_id, provider, capacity):
        """provider needs .usable() and .snapshot() -> (count, fps)."""
        self.live[node_id] = {"provider": provider, "cap": capacity}

    def set_stream_url(self, node_id, url):
        for n in self.nodes:
            if n["id"] == node_id:
                n["streamUrl"] = url

    def set_scenario(self, name):
        name = (name or "").lower()
        if name == "auto":
            self.scenario = None
            return True
        if name in SCENARIOS:
            self.scenario = name
            return True
        return False

    def set_sim(self, cfg):
        if not isinstance(cfg, dict):
            return
        for k in ("inflowRate", "outflowRate", "eventSpeed"):
            if k in cfg:
                try:
                    self.sim[k] = float(cfg[k])
                except (TypeError, ValueError):
                    pass
        if cfg.get("weatherCondition") in WEATHER_BONUS:
            self.sim["weatherCondition"] = cfg["weatherCondition"]
        # Moving the sliders hands control back to the simulation settings.
        self.scenario = None

    def acknowledge(self, alert_id):
        for a in self.alerts:
            if a["id"] == alert_id:
                a["acknowledged"] = True
                return True
        return False

    def reset(self):
        self.alerts.clear()
        self._level = {n["id"]: 0 for n in self.nodes}
        self._last_alert.clear()
        self.gate_b_closed = False
        self.scenario = "normal"
        for n in self.nodes:
            n["density"] = float(SCENARIOS["normal"][n["id"]])

    # ---------- one tick ----------
    def _target(self, node_id):
        if self.scenario in SCENARIOS:
            return float(SCENARIOS[self.scenario][node_id])
        base = SCENARIOS["normal"][node_id]
        net = self.sim["inflowRate"] - self.sim["outflowRate"]
        return clamp(base + 0.2 * net + WEATHER_BONUS.get(self.sim["weatherCondition"], 0), 5, 100)

    def step(self):
        speed = clamp(self.sim.get("eventSpeed", 1), 0.5, 3)
        for n in self.nodes:
            live = self.live.get(n["id"])
            if live and live["provider"].usable():
                count, fps = live["provider"].snapshot()
                cap = max(1, live["cap"])
                target = clamp(count / cap * 100, 0, 100)
                n["density"] += (target - n["density"]) * 0.5
                n["currentCount"] = int(count)
                n["maxCapacity"] = cap
                n["fps"] = int(round(fps)) if fps else n["_fps0"]
            else:
                target = self._target(n["id"])
                rate = clamp(0.22 * speed, 0.05, 0.6)
                n["density"] = clamp(n["density"] + (target - n["density"]) * rate + self.rng.uniform(-1.6, 1.6), 5, 100)
                n["maxCapacity"] = n["_cap0"]
                n["fps"] = n["_fps0"]
                n["currentCount"] = round(n["density"] / 100 * n["maxCapacity"])
            n["status"] = status_for(n["density"])
        new_alerts = self._evaluate_alerts()
        self.gate_b_closed = any(lv == 3 for lv in self._level.values())
        return self.build_frame(), new_alerts

    def _evaluate_alerts(self):
        out = []
        now = time.time()
        for n in self.nodes:
            d = n["density"]
            lvl, sev = 0, None
            for thr, name in LEVELS:
                if d > thr:
                    lvl, sev = RANK[name], name
                    break
            prev = self._level[n["id"]]
            if lvl > prev:
                key = (n["id"], lvl)
                if now - self._last_alert.get(key, 0) >= ALERT_COOLDOWN_S:
                    out.append(self._make_alert(n, sev))
                    self._last_alert[key] = now
                self._level[n["id"]] = lvl
            elif lvl < prev and d < RANK_THRESHOLD[prev] - 5:
                self._level[n["id"]] = lvl
        return out

    def _make_alert(self, n, sev):
        self._seq += 1
        d = int(round(n["density"]))
        if sev == "CRITICAL":
            msg = f"{n['name']}: density {d}% is over the 90% limit. Stampede risk high. Actions: {CRITICAL_ACTIONS}"
        elif sev == "HIGH":
            msg = f"{n['name']}: density {d}% of the safe limit. Please check the area and decide if crowd control is needed."
        else:
            msg = f"{n['name']}: crowd is building ({d}% of the safe limit). Keep watching."
        alert = {
            "id": f"alt-{self._seq}",
            "timestamp": now_label(),
            "nodeId": n["id"],
            "nodeName": n["name"],
            "severity": sev,
            "message": msg,
            "acknowledged": False,
        }
        self.alerts.insert(0, alert)
        del self.alerts[60:]
        return alert

    # ---------- output ----------
    def public_node(self, n):
        out = {
            "id": n["id"],
            "name": n["name"],
            "zone": n["zone"],
            "status": n["status"],
            "density": int(round(n["density"])),
            "currentCount": int(n["currentCount"]),
            "maxCapacity": int(n["maxCapacity"]),
            "fps": int(n["fps"]),
            "resolution": n["resolution"],
        }
        if n.get("streamUrl"):
            out["streamUrl"] = n["streamUrl"]
        return out

    def build_frame(self):
        nodes = [self.public_node(n) for n in self.nodes]
        total = sum(n["currentCount"] for n in nodes)
        avg = int(round(sum(n["density"] for n in nodes) / len(nodes)))
        return {
            "timestamp": now_label(),
            "totalCrowdCount": total,
            "averageDensity": avg,
            "activeAlertsCount": sum(1 for a in self.alerts if not a["acknowledged"]),
            "nodes": nodes,
        }

    def state(self):
        return {
            "frame": self.build_frame(),
            "alerts": self.alerts,
            "scenario": self.scenario or "auto",
            "simulation": self.sim,
            "gateBClosed": self.gate_b_closed,
        }
