from __future__ import annotations

from app.analysis import analyze_suite, coverage_gaps, find_duplicates


def _case(tc_id: str, title: str, action: str) -> dict:
    return {
        "id": tc_id,
        "title": title,
        "steps": [{"step": 1, "action": action, "expected": "works"}],
    }


def test_find_duplicates_detects_near_identical():
    cases = [
        _case("TC-1", "Login with valid credentials", "enter valid username and password"),
        _case("TC-2", "Login with valid credentials", "enter valid username and password"),
        _case("TC-3", "Delete account permanently", "click delete and confirm removal"),
    ]
    dups = find_duplicates(cases, threshold=0.7)
    ids = {tuple(sorted((d["a"], d["b"]))) for d in dups}
    assert ("TC-1", "TC-2") in ids


def test_find_duplicates_empty_for_single_case():
    assert find_duplicates([_case("TC-1", "only one", "do a thing")]) == []


def test_coverage_gaps_reports_missing_dimensions():
    cases = [{"category": "Positive", "type": "Functional"}]
    gaps = coverage_gaps(cases)
    joined = " ".join(gaps).lower()
    assert "negative" in joined
    assert "security" in joined


def test_coverage_gaps_none_when_covered():
    cases = [
        {"category": "Negative", "type": "Security"},
        {"category": "Boundary", "type": "Performance"},
        {"category": "Error-Handling", "type": "Accessibility"},
    ]
    assert coverage_gaps(cases) == []


def test_analyze_suite_shape():
    cases = [
        _case("TC-1", "Login valid", "enter username password"),
        _case("TC-2", "Login valid", "enter username password"),
        _case("TC-3", "Logout", "click sign out button"),
        _case("TC-4", "Reset password", "request a password reset email"),
    ]
    result = analyze_suite(cases, threshold=0.7)
    assert result["count"] == 4
    assert isinstance(result["duplicates"], list)
    assert isinstance(result["clusters"], list)
    assert isinstance(result["coverageGaps"], list)
