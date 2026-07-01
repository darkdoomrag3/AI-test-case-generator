from __future__ import annotations

from app.features import extract_features
from app.scoring import (
    heuristic_score,
    predict_priority,
    quality_flags,
    quality_label,
    score_test_cases,
)


def test_good_scores_higher_than_weak(good_case, weak_case):
    good = heuristic_score(extract_features(good_case))
    weak = heuristic_score(extract_features(weak_case))
    assert good > weak
    assert 0.0 <= weak < good <= 1.0


def test_weak_case_flags(weak_case):
    flags = quality_flags(extract_features(weak_case))
    assert "too-few-steps" in flags
    assert "missing-expected-result" in flags
    assert "no-traceability" in flags
    assert "vague-title" in flags


def test_good_case_has_no_flags(good_case):
    assert quality_flags(extract_features(good_case)) == []


def test_quality_label_bands():
    assert quality_label(0.9) == "Excellent"
    assert quality_label(0.7) == "Good"
    assert quality_label(0.5) == "Fair"
    assert quality_label(0.1) == "Poor"


def test_priority_high_for_critical():
    tc = {"priority": "Critical", "risk": "High", "severity": "Blocker"}
    assert predict_priority(tc) == "High"


def test_priority_low_for_empty():
    assert predict_priority({}) == "Low"


def test_score_test_cases_without_model(good_case, weak_case):
    results = score_test_cases([good_case, weak_case], model=None, alpha=0.5)
    assert len(results) == 2
    assert results[0]["qualityScore"] > results[1]["qualityScore"]
    assert results[0]["modelUsed"] is False
    assert results[0]["id"] == "TC-001"


def test_score_assigns_default_id_when_missing():
    results = score_test_cases([{"title": "no id"}], model=None)
    assert results[0]["id"] == "TC-001"
