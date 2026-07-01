"""Shared pytest fixtures."""

from __future__ import annotations

import pytest


@pytest.fixture
def good_case() -> dict:
    return {
        "id": "TC-001",
        "title": "Verify user can log in with valid credentials end to end",
        "priority": "High",
        "severity": "Critical",
        "risk": "High",
        "type": "Functional",
        "category": "Positive",
        "preconditions": "A registered user exists",
        "testData": "username=alice, password=correct-horse",
        "expectedResult": "User lands on the dashboard",
        "postconditions": "Session is created",
        "steps": [
            {"step": 1, "action": "Open the login page", "expected": "Form is shown"},
            {"step": 2, "action": "Enter valid credentials", "expected": "Fields accept"},
            {"step": 3, "action": "Submit the form", "expected": "Dashboard loads"},
        ],
        "requirementRefs": ["REQ-1", "REQ-2"],
        "tags": ["smoke", "regression"],
    }


@pytest.fixture
def weak_case() -> dict:
    return {
        "id": "TC-002",
        "title": "test",
        "steps": [],
        "requirementRefs": [],
        "tags": [],
    }
