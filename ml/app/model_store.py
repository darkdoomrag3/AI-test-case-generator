"""Load / hold the trained quality model artifact.

The service degrades gracefully: if no artifact is present and it cannot be
trained, scoring falls back to the pure heuristic (``available == False``).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib


class QualityModel:
    """Thin wrapper around an sklearn pipeline that yields P(high quality)."""

    def __init__(self, pipeline: Any | None = None, feature_names: list[str] | None = None):
        self._pipeline = pipeline
        self.feature_names = feature_names or []

    @property
    def available(self) -> bool:
        return self._pipeline is not None

    def predict_proba_one(self, vector: list[float]) -> float:
        if self._pipeline is None:
            raise RuntimeError("model not loaded")
        # predict_proba returns [[P(class0), P(class1)]]; class 1 == "high quality".
        proba = self._pipeline.predict_proba([vector])[0]
        return float(proba[1])


def load_model(path: str | Path) -> QualityModel:
    """Load a saved model, or return an unavailable model if it's missing/broken."""
    path = Path(path)
    if not path.exists():
        return QualityModel(None)
    try:
        bundle = joblib.load(path)
    except Exception:  
        return QualityModel(None)

    if isinstance(bundle, dict) and "pipeline" in bundle:
        return QualityModel(bundle["pipeline"], bundle.get("feature_names"))

    return QualityModel(bundle)
