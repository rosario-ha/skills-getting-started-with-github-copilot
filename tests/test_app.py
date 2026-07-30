import copy
import urllib.parse
import importlib.util
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Cargar el módulo src/app.py directamente por ruta para evitar dependencias de paquete
spec = importlib.util.spec_from_file_location("src_app", str(Path(__file__).resolve().parents[1] / "src" / "app.py"))
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)

# Arrange: TestClient y snapshot del estado original
client = TestClient(app_module.app)
_ORIGINAL_ACTIVITIES = copy.deepcopy(app_module.activities)

@pytest.fixture(autouse=True)
def reset_activities():
    app_module.activities = copy.deepcopy(_ORIGINAL_ACTIVITIES)
    yield
    app_module.activities = copy.deepcopy(_ORIGINAL_ACTIVITIES)

def signup_url(activity: str) -> str:
    return f"/activities/{urllib.parse.quote(activity)}/signup"

def test_get_activities():
    # Act
    resp = client.get("/activities")
    # Assert
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data

def test_signup_success():
    # Arrange
    activity = "Chess Club"
    email = "newstudent@example.com"
    if email in app_module.activities[activity]["participants"]:
        app_module.activities[activity]["participants"].remove(email)
    # Act
    resp = client.post(signup_url(activity), params={"email": email})
    # Assert
    assert resp.status_code == 200
    assert email in app_module.activities[activity]["participants"]

def test_signup_duplicate_returns_400():
    # Arrange
    activity = "Chess Club"
    email = "michael@mergington.edu"
    if email not in app_module.activities[activity]["participants"]:
        app_module.activities[activity]["participants"].append(email)
    # Act
    resp = client.post(signup_url(activity), params={"email": email})
    # Assert
    assert resp.status_code == 400

def test_signup_nonexistent_activity_returns_404():
    # Act
    resp = client.post(signup_url("NoSuchActivity"), params={"email": "a@b.com"})
    # Assert
    assert resp.status_code == 404

def test_unregister_success():
    # Arrange
    activity = "Chess Club"
    email = "michael@mergington.edu"
    if email not in app_module.activities[activity]["participants"]:
        app_module.activities[activity]["participants"].append(email)
    # Act
    resp = client.delete(signup_url(activity), params={"email": email})
    # Assert
    assert resp.status_code == 200
    assert email not in app_module.activities[activity]["participants"]

def test_unregister_not_signed_up_returns_404():
    # Arrange
    activity = "Chess Club"
    email = "nobody@example.com"
    if email in app_module.activities[activity]["participants"]:
        app_module.activities[activity]["participants"].remove(email)
    # Act
    resp = client.delete(signup_url(activity), params={"email": email})
    # Assert
    assert resp.status_code == 404
