import math
import os
from sqlalchemy.orm import Session
from ..models import Incident

FUSION_RADIUS_METERS = float(os.getenv("FUSION_RADIUS_METERS", "35"))

def haversine_m(lat1, lon1, lat2, lon2):
    r = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*r*math.asin(math.sqrt(min(1, a)))

def normalize_hazard(value):
    return " ".join(value.lower().strip().replace("_", " ").split())

def find_duplicate(db: Session, payload):
    candidates = db.query(Incident).filter(Incident.status != "Resolved").all()
    for item in candidates:
        if normalize_hazard(item.hazard_type) != normalize_hazard(payload.hazard_type):
            continue
        distance = haversine_m(item.latitude, item.longitude, payload.latitude, payload.longitude)
        if distance <= FUSION_RADIUS_METERS:
            return item, distance
    return None, None

def merge_observation(existing: Incident, payload):
    n = max(1, existing.observations)
    existing.latitude = (existing.latitude*n + payload.latitude)/(n+1)
    existing.longitude = (existing.longitude*n + payload.longitude)/(n+1)
    existing.observations = n + 1
    existing.confidence = max(existing.confidence, payload.confidence)
    severity_order = ["Low", "Medium", "High", "Critical"]
    if payload.severity in severity_order and existing.severity in severity_order:
        if severity_order.index(payload.severity) > severity_order.index(existing.severity):
            existing.severity = payload.severity
    existing.road_importance = max(existing.road_importance, payload.road_importance)
    if payload.evidence_note:
        existing.evidence_note = (existing.evidence_note + "\n" + payload.evidence_note).strip()
    return existing
