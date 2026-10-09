from ..models import Incident, MaintenanceTeam
from .priority import priority_score, score_explanation
from .fusion import haversine_m

def build_plan(incidents: list[Incident], teams: list[MaintenanceTeam]):
    """Greedy explainable assignment baseline. Replace with OR-Tools for global optimization."""
    open_items = [x for x in incidents if x.status not in ("Resolved", "Closed")]
    open_items.sort(key=priority_score, reverse=True)
    remaining = {t.id: max(0, int(t.capacity)) for t in teams if t.active}
    assignments = []
    unassigned = []
    for inc in open_items:
        eligible = []
        for team in teams:
            if not team.active or remaining.get(team.id, 0) <= 0:
                continue
            skillset = {s.strip().lower() for s in (team.skills or "").split(",")}
            if inc.hazard_type.lower() not in skillset and "all" not in skillset:
                continue
            distance = haversine_m(inc.latitude, inc.longitude, team.latitude, team.longitude)
            eligible.append((distance, team))
        if not eligible:
            unassigned.append({
                "incident_code": inc.incident_code,
                "priority_score": priority_score(inc),
                "reason": "No active team with capacity and matching skills."
            })
            continue
        distance, team = min(eligible, key=lambda pair: pair[0])
        remaining[team.id] -= 1
        assignments.append({
            "incident_code": inc.incident_code,
            "hazard_type": inc.hazard_type,
            "location_label": inc.location_label,
            "priority_score": priority_score(inc),
            "team_id": team.id,
            "team_name": team.name,
            "approx_distance_km": round(distance/1000, 2),
            "reason": "; ".join(score_explanation(inc)) + f"; nearest eligible team is {team.name}"
        })
    return {
        "algorithm": "priority-first greedy assignment (transparent baseline)",
        "assignments": assignments,
        "unassigned": unassigned,
        "remaining_capacity": {str(k): v for k, v in remaining.items()},
        "warning": "Prototype recommendations only. Confirm incidents and assignments with authorized staff."
    }
