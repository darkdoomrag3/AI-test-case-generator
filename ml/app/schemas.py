"""Pydantic request/response models.

Input models allow extra fields (``extra="allow"``) so the service accepts the
full test-case objects produced by the Node generator without needing to mirror
every field.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Step(BaseModel):
    model_config = ConfigDict(extra="allow")

    step: int | None = None
    action: str | None = None
    expected: str | None = None


class TestCase(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    title: str | None = None
    priority: str | None = None
    severity: str | None = None
    risk: str | None = None
    type: str | None = None
    category: str | None = None
    preconditions: str | None = None
    testData: str | None = None
    expectedResult: str | None = None
    postconditions: str | None = None
    steps: list[Step] = Field(default_factory=list)
    requirementRefs: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class ScoreRequest(BaseModel):
    testCases: list[TestCase] = Field(default_factory=list)
    alpha: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Model/heuristic blend weight; falls back to server default.",
    )


class ScoredCase(BaseModel):
    id: str
    title: str
    qualityScore: float
    qualityLabel: str
    predictedPriority: str
    flags: list[str]
    modelUsed: bool


class ScoreResponse(BaseModel):
    modelAvailable: bool
    alpha: float
    count: int
    averageQuality: float
    results: list[ScoredCase]


class AnalyzeRequest(BaseModel):
    testCases: list[TestCase] = Field(default_factory=list)
    threshold: float | None = Field(default=None, ge=0.0, le=1.0)


class DuplicatePair(BaseModel):
    a: str
    b: str
    similarity: float


class Cluster(BaseModel):
    label: str
    testCaseIds: list[str]
    size: int


class AnalyzeResponse(BaseModel):
    count: int
    duplicates: list[DuplicatePair]
    clusters: list[Cluster]
    coverageGaps: list[str]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    modelAvailable: bool


def to_dicts(cases: list[TestCase]) -> list[dict[str, Any]]:
    """Flatten validated models back into plain dicts for the ML functions."""
    return [c.model_dump() for c in cases]
