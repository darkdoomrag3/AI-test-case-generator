"""Synthetic, deterministic training data.

We don't have a labelled corpus of real test cases, so we generate two
populations — well-formed ("good", label 1) and weak ("bad", label 0) — with
enough variation for a linear model to learn the boundary. Determinism (no
randomness) keeps CI reproducible.
"""

from __future__ import annotations

from typing import Any


def _good_case(i: int) -> dict[str, Any]:
    """A complete, review-ready test case."""
    n_steps = 3 + (i % 4)  # 3..6 steps
    steps = [
        {
            "step": s + 1,
            "action": f"Perform action number {s + 1} with valid input data set {i}",
            "expected": f"System responds with the correct outcome for step {s + 1}",
        }
        for s in range(n_steps)
    ]
    return {
        "id": f"GOOD-{i:03d}",
        "title": f"Verify feature {i} handles a valid end-to-end workflow correctly",
        "priority": ["Critical", "High", "Medium"][i % 3],
        "severity": ["Blocker", "Critical", "Major"][i % 3],
        "risk": ["High", "Medium"][i % 2],
        "type": ["Functional", "Integration", "E2E"][i % 3],
        "category": ["Positive", "Negative", "Boundary"][i % 3],
        "preconditions": "A registered user account exists and the service is running",
        "testData": f"username=user{i}, amount={i * 10}, boundary={i}",
        "expectedResult": "The workflow completes and state is persisted as expected",
        "postconditions": "Test data is cleaned up and the system returns to baseline",
        "steps": steps,
        "requirementRefs": [f"REQ-{i}", f"BRD-{i % 5}"],
        "tags": ["regression", "smoke"],
    }


def _bad_case(i: int) -> dict[str, Any]:
    """A weak/incomplete test case (missing structure and traceability)."""
    n_steps = i % 2  # 0 or 1 step
    steps = [
        {"step": 1, "action": "do it", "expected": ""}
        for _ in range(n_steps)
    ]
    return {
        "id": f"BAD-{i:03d}",
        "title": ["test", "check thing", "todo"][i % 3],
        "steps": steps,
        "requirementRefs": [],
        "tags": [],
    }


def build_examples(n: int = 160) -> tuple[list[dict[str, Any]], list[int]]:
    """Return (test_case_dicts, labels) with a balanced good/bad split."""
    cases: list[dict[str, Any]] = []
    labels: list[int] = []
    for i in range(n):
        if i % 2 == 0:
            cases.append(_good_case(i))
            labels.append(1)
        else:
            cases.append(_bad_case(i))
            labels.append(0)
    return cases, labels
