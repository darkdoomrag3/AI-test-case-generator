"""Runtime configuration, sourced from environment variables.

Every knob has a sensible default so the service runs with zero config in
local dev while staying fully overridable in CI / containers.
"""

from __future__ import annotations

import os
from pathlib import Path

# ml/  (parent of the app package)
BASE_DIR = Path(__file__).resolve().parent.parent


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ[name])
    except (KeyError, ValueError):
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() not in ("0", "false", "no", "off", "")


# Path to the trained quality model artifact (joblib).
MODEL_PATH = Path(
    os.environ.get("QA_ML_MODEL_PATH", str(BASE_DIR / "models" / "quality_model.joblib"))
)

# Cosine-similarity cutoff above which two test cases are flagged as duplicates.
DUPLICATE_THRESHOLD = _env_float("QA_ML_DUP_THRESHOLD", 0.75)

# Blend weight for the ML model vs the heuristic score (0 = pure heuristic).
MODEL_BLEND_ALPHA = _env_float("QA_ML_MODEL_ALPHA", 0.5)

# HTTP port for local `python -m app.main` / uvicorn convenience.
SERVICE_PORT = int(os.environ.get("QA_ML_PORT", "8000"))

# When the model artifact is missing at startup, train one on the fly.
AUTO_TRAIN = _env_bool("QA_ML_AUTO_TRAIN", True)
