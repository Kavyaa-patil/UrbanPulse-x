SEVERITY_BASE = {"Critical": 70, "High": 52, "Medium": 32, "Low": 15}

def priority_score(incident) -> float:
    """Transparent demo heuristic; not a validated engineering risk model."""
    base = SEVERITY_BASE.get(incident.severity, 25)
    recurrence = min(max(incident.observations - 1, 0), 8) * 3.5
    confidence = max(0.0, min(float(incident.confidence), 1.0)) * 10
    importance = max(1, min(int(incident.road_importance), 5)) * 3
    return round(min(100.0, base + recurrence + confidence + importance), 1)

def score_explanation(incident) -> list[str]:
    reasons = [f"{incident.severity} severity baseline"]
    if incident.observations > 1:
        reasons.append(f"Repeated {incident.observations} times")
    if incident.road_importance >= 4:
        reasons.append("High-importance road segment")
    if incident.confidence < 0.45:
        reasons.append("Low confidence: human verification recommended")
    return reasons
