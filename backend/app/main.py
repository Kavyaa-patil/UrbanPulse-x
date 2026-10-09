import os
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .database import Base, engine, get_db
from .models import Incident, MaintenanceTeam
from .schemas import IncidentCreate, IncidentOut
from .seed import seed_demo
from .services.fusion import find_duplicate, merge_observation
from .services.priority import priority_score
from .services.planner import build_plan
from .services.vision import model_status, infer_image

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if os.getenv("SEED_DEMO_DATA", "true").lower() == "true":
        db = next(get_db())
        try:
            seed_demo(db)
        finally:
            db.close()
    yield

app = FastAPI(title="UrbanPulse X API", version="0.1.0",
              description="Autonomous road incident intelligence prototype", lifespan=lifespan)

origins = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5174"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

def serialize(incident):
    data = {c.name: getattr(incident, c.name) for c in incident.__table__.columns}
    data["priority_score"] = priority_score(incident)
    return data

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "UrbanPulse X API", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/incidents")
def list_incidents(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    items = query.order_by(desc(Incident.updated_at)).all()
    result = [serialize(x) for x in items]
    result.sort(key=lambda x: x["priority_score"], reverse=True)
    return result

@app.post("/api/incidents")
def create_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    allowed = {"Low", "Medium", "High", "Critical"}
    if payload.severity not in allowed:
        raise HTTPException(status_code=422, detail=f"severity must be one of {sorted(allowed)}")
    existing, distance = find_duplicate(db, payload)
    if existing:
        merge_observation(existing, payload)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return {"merged": True, "distance_m": round(distance, 1), "incident": serialize(existing)}
    item = Incident(
        incident_code="UPX-" + uuid4().hex[:8].upper(),
        hazard_type=payload.hazard_type.strip(),
        latitude=payload.latitude, longitude=payload.longitude,
        location_label=payload.location_label.strip(),
        severity=payload.severity, confidence=payload.confidence,
        road_importance=payload.road_importance, observations=1,
        status="Open", source=payload.source, evidence_note=payload.evidence_note
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"merged": False, "distance_m": None, "incident": serialize(item)}

@app.post("/api/incidents/{incident_code}/resolve")
def resolve_incident(incident_code: str, db: Session = Depends(get_db)):
    item = db.query(Incident).filter(Incident.incident_code == incident_code).first()
    if not item:
        raise HTTPException(status_code=404, detail="Incident not found")
    item.status = "Resolved"
    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return serialize(item)

@app.get("/api/planner/plan")
def planner(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    teams = db.query(MaintenanceTeam).filter(MaintenanceTeam.active == 1).all()
    return build_plan(incidents, teams)

@app.post("/api/planner/replan")
def replan(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    teams = db.query(MaintenanceTeam).filter(MaintenanceTeam.active == 1).all()
    plan = build_plan(incidents, teams)
    plan["generated_at"] = datetime.utcnow().isoformat()
    plan["trigger"] = "manual scenario replan"
    return plan

@app.get("/api/vision/status")
def vision_status():
    return model_status()

@app.post("/api/vision/image")
async def vision_image(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload a valid image file.")
    raw = await file.read()
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be smaller than 12 MB.")
    try:
        return infer_image(raw, file.filename or "upload")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
