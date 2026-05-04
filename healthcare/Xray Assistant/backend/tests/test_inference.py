from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_inference_returns_stub_response() -> None:
    response = client.post("/api/inference", json={"image_uri": "sample.png"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["image_uri"] == "sample.png"
    assert payload["findings"][0]["label"] == "normal"

