from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from .database import Base

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    incident_code = Column(String(32), unique=True, index=True, nullable=False)
    hazard_type = Column(String(80), index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_label = Column(String(240), default="Unspecified location")
    severity = Column(String(20), default="Medium")
    confidence = Column(Float, default=0.5)
    observations = Column(Integer, default=1)
    road_importance = Column(Integer, default=3)  # 1..5
    status = Column(String(30), default="Open")
    source = Column(String(80), default="Demo")
    evidence_note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MaintenanceTeam(Base):
    __tablename__ = "maintenance_teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, default=2)
    skills = Column(String(240), default="Pothole,Road damage,Waterlogging,Obstruction")
    active = Column(Integer, default=1)
