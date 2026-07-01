"""Feature engineering.

The SAME functions are used at training time (``training/train.py``) and at
serving time (``app/scoring.py``). Keeping a single source of truth for feature
extraction is what stops train/serve skew.
"""

from __future__ import annotations

from typing import Any

# Order matters: the model is trained on vectors in exactly this order.
FEATURE_NAMES: list[str] = [
    "step_count",
    "steps_with_expected_ratio",
    "has_expected_result",
    "has_preconditions",
    "has_test_data",
    "has_postconditions",
    "requirement_ref_count",
    "tag_count",
    "title_word_count",
    "avg_action_word_count",
    "has_priority",
    "has_type",
]


def _steps(tc: dict[str, Any]) -> list[dict[str, Any]]:
    steps = tc.get("steps")
    if not isinstance(steps, list):
        return []
    return [s for s in steps if isinstance(s, dict)]


def _nonempty(value: Any) -> bool:
    return bool(value is not None and str(value).strip())


def extract_features(tc: dict[str, Any]) -> dict[str, float]:
    """Turn one test-case dict into a named numeric feature map."""
    steps = _steps(tc)
    step_count = len(steps)

    with_expected = sum(1 for s in steps if _nonempty(s.get("expected")))
    ratio = (with_expected / step_count) if step_count else 0.0

    action_word_counts = [len(str(s.get("action") or "").split()) for s in steps]
    avg_action = (
        sum(action_word_counts) / len(action_word_counts) if action_word_counts else 0.0
    )

    refs = tc.get("requirementRefs")
    ref_count = len(refs) if isinstance(refs, list) else 0

    tags = tc.get("tags")
    tag_count = len(tags) if isinstance(tags, list) else 0

    title = str(tc.get("title") or "")

    return {
        "step_count": float(step_count),
        "steps_with_expected_ratio": float(ratio),
        "has_expected_result": 1.0 if _nonempty(tc.get("expectedResult")) else 0.0,
        "has_preconditions": 1.0 if _nonempty(tc.get("preconditions")) else 0.0,
        "has_test_data": 1.0 if _nonempty(tc.get("testData")) else 0.0,
        "has_postconditions": 1.0 if _nonempty(tc.get("postconditions")) else 0.0,
        "requirement_ref_count": float(ref_count),
        "tag_count": float(tag_count),
        "title_word_count": float(len(title.split())),
        "avg_action_word_count": float(avg_action),
        "has_priority": 1.0 if _nonempty(tc.get("priority")) else 0.0,
        "has_type": 1.0 if _nonempty(tc.get("type")) else 0.0,
    }


def feature_vector(tc: dict[str, Any]) -> list[float]:
    """Feature map flattened into a vector in ``FEATURE_NAMES`` order."""
    feats = extract_features(tc)
    return [feats[name] for name in FEATURE_NAMES]
