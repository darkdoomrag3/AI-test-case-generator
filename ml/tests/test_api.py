from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def _client() -> TestClient:
    # `with` triggers the lifespan handler (model load / train).
    return TestClient(app)


def test_health():
    with _client() as client:
        resp = client.get("/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "ok"
        assert body["service"] == "qa-workbench-ml"
        assert "modelAvailable" in body


def test_score_endpoint(good_case, weak_case):
    with _client() as client:
        resp = client.post(
            "/score", json={"testCases": [good_case, weak_case]}
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 2
        assert 0.0 <= body["averageQuality"] <= 1.0
        results = body["results"]
        assert results[0]["qualityScore"] > results[1]["qualityScore"]
        assert results[1]["flags"]


def test_score_empty():
    with _client() as client:
        resp = client.post("/score", json={"testCases": []})
        assert resp.status_code == 200
        assert resp.json()["averageQuality"] == 0.0


def test_analyze_endpoint():
    cases = [
        {
            "id": "TC-1",
            "title": "Login with valid credentials",
            "category": "Positive",
            "type": "Functional",
            "steps": [{"step": 1, "action": "enter username and password", "expected": "ok"}],
        },
        {
            "id": "TC-2",
            "title": "Login with valid credentials",
            "category": "Positive",
            "type": "Functional",
            "steps": [{"step": 1, "action": "enter username and password", "expected": "ok"}],
        },
    ]
    with _client() as client:
        resp = client.post("/analyze", json={"testCases": cases, "threshold": 0.7})
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] == 2
        assert len(body["duplicates"]) >= 1
        assert any("security" in g.lower() for g in body["coverageGaps"])
