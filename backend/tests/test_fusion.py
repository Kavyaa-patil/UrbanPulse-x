from types import SimpleNamespace
from app.services.fusion import haversine_m, normalize_hazard
from app.services.priority import priority_score

def test_haversine_same_point():
    assert haversine_m(12.0, 76.0, 12.0, 76.0) == 0

def test_haversine_nearby_points():
    distance = haversine_m(12.0, 76.0, 12.0001, 76.0)
    assert 5 < distance < 20

def test_normalize_hazard():
    assert normalize_hazard("  ROAD_damage ") == "road damage"

def test_priority_increases_with_recurrence():
    one = SimpleNamespace(severity="Medium", observations=1, confidence=.7, road_importance=3)
    repeat = SimpleNamespace(severity="Medium", observations=4, confidence=.7, road_importance=3)
    assert priority_score(repeat) > priority_score(one)
