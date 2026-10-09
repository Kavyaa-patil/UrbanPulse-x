from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class IncidentCreate(BaseModel):
    hazard_type: str = Field(min_length=2, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    location_label: str = Field(default="Unspecified location", max_length=240)
    severity: str = Field(default="Medium")
    confidence: float = Field(default=0.5, ge=0, le=1)
    road_importance: int = Field(default=3, ge=1, le=5)
    source: str = Field(default="Bus camera demo", max_length=80)
    evidence_note: str = Field(default="", max_length=2000)

class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_code: str
    hazard_type: str
    latitude: float
    longitude: float
    location_label: str
    severity: str
    confidence: float
    observations: int
    road_importance: int
    status: str
    source: str
    evidence_note: str
    created_at: datetime
    updated_at: datetime
    priority_score: float = 0

class VisionDetection(BaseModel):
    label: str
    confidence: float
    xyxy: list[float]

class VisionResult(BaseModel):
    filename: str
    model: str
    detections: list[VisionDetection]
    note: str
