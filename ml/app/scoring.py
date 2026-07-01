"""Quality scoring: a rule-based heuristic blended with a light ML model.

- The heuristic gives an interpretable completeness score and human-readable
  flags (what's missing / weak in a test case).
- The optional ``LogisticRegression`` model nudges the score based on patterns
  learned from labelled examples.
- Priority is derived from declared QA metadata via transparent rules.
"""

from __future__ import annotations

from typing import Any

from .features import extract_features, feature_vector
from .model_store import QualityModel

# Weights sum to 1.0 — the heuristic score is already normalised to [0, 1].
_HEURISTIC_WEIGHTS = {
    "step_count": 0.20,
    "steps_with_expected_ratio": 0.20,
    "has_expected_result": 0.15,
    "has_preconditions": 0.10,
    "has_test_data": 0.10,
    "requirement_ref_count": 0.10,
    "has_postconditions": 0.05,
    "title_word_count": 0.05,
    "tag_count": 0.05,
}


def heuristic_score(feats: dict[str, float]) -> float:
    """Interpretable completeness score in [0, 1]."""
    score = 0.0
    score += _HEURISTIC_WEIGHTS["step_count"] * min(feats["step_count"] / 5.0, 1.0)
    score += _HEURISTIC_WEIGHTS["steps_with_expected_ratio"] * feats[
        "steps_with_expected_ratio"
    ]
    score += _HEURISTIC_WEIGHTS["has_expected_result"] * feats["has_expected_result"]
    score += _HEURISTIC_WEIGHTS["has_preconditions"] * feats["has_preconditions"]
    score += _HEURISTIC_WEIGHTS["has_test_data"] * feats["has_test_data"]
    score += _HEURISTIC_WEIGHTS["requirement_ref_count"] * min(
        feats["requirement_ref_count"] / 2.0, 1.0
    )
    score += _HEURISTIC_WEIGHTS["has_postconditions"] * feats["has_postconditions"]
    score += _HEURISTIC_WEIGHTS["title_word_count"] * min(
        feats["title_word_count"] / 6.0, 1.0
    )
    score += _HEURISTIC_WEIGHTS["tag_count"] * min(feats["tag_count"] / 2.0, 1.0)
    return min(score, 1.0)


def quality_flags(feats: dict[str, float]) -> list[str]:
    """Human-readable weaknesses, ordered most to least important."""
    flags: list[str] = []
    if feats["step_count"] < 2:
        flags.append("too-few-steps")
    if feats["step_count"] and feats["steps_with_expected_ratio"] < 0.5:
        flags.append("steps-missing-expected")
    if not feats["has_expected_result"]:
        flags.append("missing-expected-result")
    if not feats["has_preconditions"]:
        flags.append("missing-preconditions")
    if not feats["has_test_data"]:
        flags.append("missing-test-data")
    if feats["requirement_ref_count"] == 0:
        flags.append("no-traceability")
    if feats["title_word_count"] < 3:
        flags.append("vague-title")
    return flags


def quality_label(score: float) -> str:
    if score >= 0.8:
        return "Excellent"
    if score >= 0.6:
        return "Good"
    if score >= 0.4:
        return "Fair"
    return "Poor"


def predict_priority(tc: dict[str, Any]) -> str:
    """Rule-based priority from declared QA metadata (risk/severity/type)."""
    declared = str(tc.get("priority") or "").lower()
    risk = str(tc.get("risk") or "").lower()
    severity = str(tc.get("severity") or "").lower()
    tc_type = str(tc.get("type") or "").lower()
    category = str(tc.get("category") or "").lower()

    points = 0
    if declared in ("critical", "high"):
        points += 2
    elif declared == "medium":
        points += 1

    if risk == "high":
        points += 2
    elif risk == "medium":
        points += 1

    if severity in ("blocker", "critical"):
        points += 2
    elif severity == "major":
        points += 1

    if tc_type in ("security", "e2e", "integration"):
        points += 1
    if category in ("negative", "error-handling", "boundary"):
        points += 1

    if points >= 4:
        return "High"
    if points >= 2:
        return "Medium"
    return "Low"


def score_test_case(
    tc: dict[str, Any],
    model: QualityModel | None = None,
    alpha: float = 0.5,
    index: int = 0,
) -> dict[str, Any]:
    feats = extract_features(tc)
    base = heuristic_score(feats)

    model_used = False
    if model is not None and model.available and alpha > 0:
        prob = model.predict_proba_one(feature_vector(tc))
        final = alpha * prob + (1 - alpha) * base
        model_used = True
    else:
        final = base

    final = round(min(max(final, 0.0), 1.0), 4)
    tc_id = tc.get("id") or f"TC-{index + 1:03d}"

    return {
        "id": tc_id,
        "title": tc.get("title") or "",
        "qualityScore": final,
        "qualityLabel": quality_label(final),
        "predictedPriority": predict_priority(tc),
        "flags": quality_flags(feats),
        "modelUsed": model_used,
    }


def score_test_cases(
    test_cases: list[dict[str, Any]],
    model: QualityModel | None = None,
    alpha: float = 0.5,
) -> list[dict[str, Any]]:
    return [
        score_test_case(tc, model=model, alpha=alpha, index=i)
        for i, tc in enumerate(test_cases)
    ]
