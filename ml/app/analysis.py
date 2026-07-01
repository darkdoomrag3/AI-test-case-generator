"""Suite-level analysis: semantic duplicates, coverage clusters, and gaps.

Uses TF-IDF + cosine similarity (scikit-learn) rather than large embedding
models, so it stays fast and dependency-light in CI.
"""

from __future__ import annotations

import math
from typing import Any

from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Categories / types we expect a well-rounded suite to cover.
_EXPECTED_CATEGORIES = {
    "negative": "No negative test cases (invalid input / failure paths)",
    "boundary": "No boundary / edge-case tests",
    "error-handling": "No explicit error-handling tests",
}
_EXPECTED_TYPES = {
    "security": "No security-focused tests",
    "performance": "No performance tests",
    "accessibility": "No accessibility tests",
}


def _text(tc: dict[str, Any]) -> str:
    parts = [str(tc.get("title") or "")]
    steps = tc.get("steps")
    if isinstance(steps, list):
        for step in steps:
            if isinstance(step, dict):
                parts.append(str(step.get("action") or ""))
                parts.append(str(step.get("expected") or ""))
    parts.append(str(tc.get("expectedResult") or ""))
    return " ".join(p for p in parts if p).strip()


def _tc_id(tc: dict[str, Any], index: int) -> str:
    return tc.get("id") or f"TC-{index + 1:03d}"


def find_duplicates(
    test_cases: list[dict[str, Any]], threshold: float = 0.75
) -> list[dict[str, Any]]:
    """Return pairs of test cases whose text similarity >= threshold."""
    texts = [_text(tc) for tc in test_cases]
    if sum(1 for t in texts if t) < 2:
        return []

    try:
        matrix = TfidfVectorizer(stop_words="english").fit_transform(texts)
    except ValueError:

        return []
    if matrix.shape[1] == 0:
        return []

    sim = cosine_similarity(matrix)
    pairs: list[dict[str, Any]] = []
    n = len(test_cases)
    for i in range(n):
        for j in range(i + 1, n):
            score = float(sim[i][j])
            if score >= threshold:
                pairs.append(
                    {
                        "a": _tc_id(test_cases[i], i),
                        "b": _tc_id(test_cases[j], j),
                        "similarity": round(score, 4),
                    }
                )
    pairs.sort(key=lambda p: p["similarity"], reverse=True)
    return pairs


def cluster_suite(test_cases: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Group test cases into coverage clusters labelled by top TF-IDF terms."""
    texts = [_text(tc) for tc in test_cases]
    if sum(1 for t in texts if t) < 2:
        return []

    vectorizer = TfidfVectorizer(stop_words="english")
    try:
        matrix = vectorizer.fit_transform(texts)
    except ValueError:
        return []
    if matrix.shape[1] == 0:
        return []

    n = len(test_cases)
    k = max(2, min(int(math.sqrt(n)), n))
    k = min(k, matrix.shape[0])

    labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(matrix)
    terms = vectorizer.get_feature_names_out()

    clusters: dict[int, list[int]] = {}
    for idx, label in enumerate(labels):
        clusters.setdefault(int(label), []).append(idx)

    result: list[dict[str, Any]] = []
    dense = matrix.toarray()
    for label, members in sorted(clusters.items()):

        mean_weights = dense[members].mean(axis=0)
        top_idx = mean_weights.argsort()[::-1][:3]
        top_terms = [terms[t] for t in top_idx if mean_weights[t] > 0]
        result.append(
            {
                "label": ", ".join(top_terms) if top_terms else f"cluster-{label}",
                "testCaseIds": [_tc_id(test_cases[m], m) for m in members],
                "size": len(members),
            }
        )
    result.sort(key=lambda c: c["size"], reverse=True)
    return result


def coverage_gaps(test_cases: list[dict[str, Any]]) -> list[str]:
    """Heuristic list of coverage dimensions the suite appears to be missing."""
    categories = {str(tc.get("category") or "").lower() for tc in test_cases}
    types = {str(tc.get("type") or "").lower() for tc in test_cases}

    gaps: list[str] = []
    for key, message in _EXPECTED_CATEGORIES.items():
        if key not in categories:
            gaps.append(message)
    for key, message in _EXPECTED_TYPES.items():
        if key not in types:
            gaps.append(message)
    return gaps


def analyze_suite(
    test_cases: list[dict[str, Any]], threshold: float = 0.75
) -> dict[str, Any]:
    return {
        "count": len(test_cases),
        "duplicates": find_duplicates(test_cases, threshold=threshold),
        "clusters": cluster_suite(test_cases),
        "coverageGaps": coverage_gaps(test_cases),
    }
