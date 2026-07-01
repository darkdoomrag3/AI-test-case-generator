"""FastAPI application entrypoint for the QA Workbench ML service.

Endpoints
---------
GET  /health   liveness + whether the ML model is loaded
POST /score    quality + priority scoring for a list of test cases
POST /analyze  duplicate detection, coverage clusters, and gaps
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__, config
from .analysis import analyze_suite
from .model_store import QualityModel, load_model
from .schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse,
    ScoreRequest,
    ScoreResponse,
    to_dicts,
)
from .scoring import score_test_cases

# Holds the loaded model between requests (populated in the lifespan handler).
_state: dict[str, QualityModel] = {}


def _load_or_train() -> QualityModel:
    model = load_model(config.MODEL_PATH)
    if model.available or not config.AUTO_TRAIN:
        return model
    # No artifact on disk — try to train one so /score uses the ML path.
    try:
        from training.train import train_and_save

        train_and_save(config.MODEL_PATH)
        return load_model(config.MODEL_PATH)
    except Exception:  
        return QualityModel(None)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _state["model"] = _load_or_train()
    yield
    _state.clear()


app = FastAPI(
    title="QA Workbench ML service",
    version=__version__,
    summary="Test-case quality scoring and suite analysis",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _model() -> QualityModel:
    return _state.get("model") or QualityModel(None)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="qa-workbench-ml",
        version=__version__,
        modelAvailable=_model().available,
    )


@app.post("/score", response_model=ScoreResponse)
def score(request: ScoreRequest) -> ScoreResponse:
    model = _model()
    alpha = request.alpha if request.alpha is not None else config.MODEL_BLEND_ALPHA
    cases = to_dicts(request.testCases)

    results = score_test_cases(cases, model=model, alpha=alpha)
    avg = (
        round(sum(r["qualityScore"] for r in results) / len(results), 4)
        if results
        else 0.0
    )
    return ScoreResponse(
        modelAvailable=model.available,
        alpha=alpha,
        count=len(results),
        averageQuality=avg,
        results=results,
    )


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    threshold = (
        request.threshold
        if request.threshold is not None
        else config.DUPLICATE_THRESHOLD
    )
    cases = to_dicts(request.testCases)
    return AnalyzeResponse(**analyze_suite(cases, threshold=threshold))


def main() -> None:  
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=config.SERVICE_PORT)


if __name__ == "__main__":  
    main()
