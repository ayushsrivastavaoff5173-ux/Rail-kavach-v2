# RailKavach AI - Backend

FastAPI + WebSocket server. Sends live crowd telemetry and alerts to the Next.js dashboard.

## Run (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --port 8000
```
Check: http://localhost:8000/api/health

## Frontend
```powershell
cd frontend
copy .env.local.example .env.local   # or create it, see below
npm run dev
```
`frontend/.env.local`:
```
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_AUTO_LIVE=true
```

## Modes (backend/.env -> SOURCE)
- `simulator` (default): no camera/video/GPU needed.
- `video`: YOLOv8 person counting on a recorded clip for cam-1. Needs `pip install -r requirements-vision.txt` and a clip in `backend/videos/`.
- `webcam`: same, on the laptop camera.

If the backend is off, the dashboard falls back to its built-in mock mode.

## Demo scenarios
```powershell
curl.exe -X POST http://localhost:8000/api/scenario/normal
curl.exe -X POST http://localhost:8000/api/scenario/moderate
curl.exe -X POST http://localhost:8000/api/scenario/surge
curl.exe -X POST http://localhost:8000/api/reset
```
Privacy: only counts people. No face recognition, no identity data.
