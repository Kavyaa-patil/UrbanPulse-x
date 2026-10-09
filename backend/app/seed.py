from sqlalchemy.orm import Session
from .models import Incident, MaintenanceTeam

def seed_demo(db: Session):
    if db.query(Incident).count() == 0:
        samples = [
            Incident(incident_code="UPX-1001", hazard_type="Pothole", latitude=12.3108, longitude=76.6080,
                     location_label="Vijayanagar (sample)", severity="High", confidence=.82, observations=3,
                     road_importance=4, source="Simulated bus A", evidence_note="Illustrative seed incident."),
            Incident(incident_code="UPX-1002", hazard_type="Waterlogging", latitude=12.2790, longitude=76.6240,
                     location_label="Kuvempunagar (sample)", severity="Critical", confidence=.75, observations=2,
                     road_importance=5, source="Simulated bus B", evidence_note="Illustrative seed incident."),
            Incident(incident_code="UPX-1003", hazard_type="Road damage", latitude=12.3560, longitude=76.6200,
                     location_label="Hebbal (sample)", severity="Medium", confidence=.62, observations=1,
                     road_importance=3, source="Simulated bus C", evidence_note="Illustrative seed incident."),
            Incident(incident_code="UPX-1004", hazard_type="Obstruction", latitude=12.3020, longitude=76.6650,
                     location_label="Nazarbad (sample)", severity="Low", confidence=.51, observations=1,
                     road_importance=2, source="Simulated bus A", evidence_note="Illustrative seed incident.")
        ]
        db.add_all(samples)
    if db.query(MaintenanceTeam).count() == 0:
        teams = [
            MaintenanceTeam(name="Road Team Alpha", latitude=12.3000, longitude=76.6200, capacity=2,
                            skills="Pothole,Road damage,Waterlogging,Obstruction"),
            MaintenanceTeam(name="Road Team Beta", latitude=12.3500, longitude=76.6300, capacity=2,
                            skills="Pothole,Road damage,Waterlogging,Obstruction"),
            MaintenanceTeam(name="Drainage Team Gamma", latitude=12.2800, longitude=76.6300, capacity=1,
                            skills="Waterlogging,Obstruction")
        ]
        db.add_all(teams)
    db.commit()
