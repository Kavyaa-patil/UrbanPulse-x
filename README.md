# UrbanPulse X
### Autonomous City Road Intelligence | Infothon 7.0 — PS #07

UrbanPulse X is a GitHub-ready research prototype for turning bus-camera observations into a shared road-incident intelligence layer, then creating explainable, resource-aware maintenance plans.

## What works in this repository
- FastAPI backend with SQLite persistence and typed request/response schemas.
- Incident intake and list APIs.
- Geospatial duplicate fusion: reports near the same coordinates and of the same hazard type are grouped into a shared incident.
- Explainable priority scoring using severity, repeat observations, confidence, and road importance.
- Maintenance planning that assigns simulated teams while respecting team capacity and approximate travel distance.
- Scenario endpoint that replans after new incidents or resource changes.
- Image inference endpoint that uses a configured Ultralytics YOLO weights file if supplied.
- React + Vite frontend with dashboard, incident intake, planner, and image inference views.
- Seeded sample incidents clearly labelled as demo data.

## Important computer-vision limitation
A generic COCO-pretrained YOLO model is **not** a road-damage detector. For real pothole/crack/waterlogging detection, configure `ROAD_MODEL_PATH` to a model trained on a suitable labelled road-hazard dataset. Without that file, `/api/vision/status` reports that detection weights are not configured and `/api/vision/image` returns a clear error instead of inventing detections.

## Architecture
```text
React + Vite
   | REST / JSON + image upload
   v
FastAPI API
   ├── Incident service ── SQLite
   ├── Geospatial fusion (Haversine + time window)
   ├── Risk/priority engine (explainable heuristic)
   ├── Maintenance planner (greedy constrained assignment)
   └── Vision adapter ── configured YOLO weights (optional)
```

## Repository structure
```text
UrbanPulse_X/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── services/
│   │   │   ├── fusion.py
│   │   │   ├── priority.py
│   │   │   ├── planner.py
│   │   │   └── vision.py
│   │   └── seed.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Requirements
- Python 3.10+
- Node.js 20+ recommended
- Git
- Optional: a trained Ultralytics-compatible road-hazard model file (`.pt`)

## Run locally on Windows (PowerShell)

### 1. Start the backend
Open terminal in the repository root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Backend docs: http://127.0.0.1:8000/docs

The API seeds sample demo incidents on first run. Set `SEED_DEMO_DATA=false` in `.env` to disable.

### 2. Start the frontend in a second terminal
From repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173).

### macOS/Linux backend activation
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Configure road-hazard vision
1. Obtain a road-hazard model whose licence permits your intended use.
2. Place it locally, e.g. `backend/models/road_hazards.pt` (do not commit large weights unless allowed).
3. In `backend/.env`, set:
   ```env
   ROAD_MODEL_PATH=models/road_hazards.pt
   ```
   The path is resolved relative to the `backend` directory.
4. Restart the backend and check `GET /api/vision/status`.

The model's class names depend on the weights you use. The application reports the model's actual class names and confidence values; it does not claim a model detects classes it was not trained to detect.

## API endpoints
- `GET /api/health`
- `GET /api/incidents`
- `POST /api/incidents`
- `POST /api/incidents/{incident_id}/resolve`
- `GET /api/planner/plan`
- `POST /api/planner/replan`
- `GET /api/vision/status`
- `POST /api/vision/image`

OpenAPI docs are generated at `/docs`.

## Priority score
The prototype's transparent score combines:
- severity baseline,
- repeat observation count,
- model confidence,
- road importance.

This is a demo heuristic, not a validated municipal standard. Tune and evaluate it with road-engineering stakeholders before real-world use.

## Fusion method
Two observations are candidates for merging when:
- their normalized hazard types match,
- their coordinates are within the configured radius (default 35 m),
- and the existing incident is not resolved.

The incident's observation count increases and its location is updated with a running average. A production version should also compare image embeddings and enforce a time window.

## Maintenance planner
The planner sorts open incidents by priority, then assigns each incident to the nearest available simulated team while respecting team capacity. It is deliberately transparent and deterministic for evaluation. A future version could use OR-Tools for a global vehicle-routing/assignment optimization.

## Validation checklist
- [ ] `GET /api/health` returns `{"status":"ok", ...}`.
- [ ] Sample incidents appear in the dashboard.
- [ ] Submitting the same hazard type within 35 m merges it into the existing incident.
- [ ] Replan returns assignments and explanations.
- [ ] Vision status clearly shows whether model weights are configured.
- [ ] If weights are configured, image inference returns model detections.
- [ ] Screenshots and a short demo video are added to the GitHub README after testing.

## Honest claims for judging
Call this a **working prototype with configurable road-hazard inference**. Do not claim a road-hazard detector is operational until a suitable trained model is installed and evaluated. The included seeded incidents and team locations are simulated examples.
