"""Train the quality model and persist it as a joblib artifact.

Run from the ``ml/`` directory:

    python -m training.train

The pipeline (StandardScaler + LogisticRegression) is deliberately small: this
is the "light ML" half of the heuristic + ML hybrid. Retraining is fast and
deterministic, which makes it a good step to wire into CI.
"""

from __future__ import annotations

from pathlib import Path

import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app import config
from app.features import FEATURE_NAMES, feature_vector
from training.dataset import build_examples


def build_pipeline() -> Pipeline:
    return Pipeline(
        [
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000)),
        ]
    )


def train_and_save(path: str | Path | None = None) -> Path:
    """Train on the synthetic dataset and dump the model bundle to ``path``."""
    path = Path(path) if path is not None else config.MODEL_PATH
    path.parent.mkdir(parents=True, exist_ok=True)

    cases, labels = build_examples()
    features = [feature_vector(tc) for tc in cases]

    pipeline = build_pipeline()
    pipeline.fit(features, labels)

    bundle = {"pipeline": pipeline, "feature_names": FEATURE_NAMES}
    joblib.dump(bundle, path)
    return path


def main() -> None:
    cases, labels = build_examples()
    features = [feature_vector(tc) for tc in cases]

    scores = cross_val_score(build_pipeline(), features, labels, cv=5)
    path = train_and_save()

    print(f"Trained on {len(cases)} examples ({sum(labels)} good / "
          f"{len(labels) - sum(labels)} bad).")
    print(f"5-fold CV accuracy: {scores.mean():.3f} +/- {scores.std():.3f}")
    print(f"Saved model -> {path}")


if __name__ == "__main__":
    main()
