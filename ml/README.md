# QA Workbench ML service

A standalone **Python / FastAPI** microservice that complements the Node.js
[QA Workbench](../README.md). It scores generated test cases for quality and
priority, and analyses a suite for duplicates, coverage clusters, and gaps.

It runs independently on its own port so you can build and deploy it with its
own CI/CD pipeline.

```
Node app (:3847)  ──HTTP──▶  ML service (:8000)
  test suites                 /score  → quality + priority
                              /analyze → duplicates + clusters + gaps
```

## Approach

A **heuristic + light ML hybrid**:

- **Heuristic** — transparent, weighted completeness score plus human-readable
  flags (`missing-expected-result`, `too-few-steps`, `no-traceability`, …).
- **ML** — a small scikit-learn pipeline (`StandardScaler` + `LogisticRegression`)
  trained on a synthetic, balanced dataset. Its probability is blended with the
  heuristic (`alpha`, default `0.5`).
- **Analysis** — TF-IDF + cosine similarity for duplicate detection and KMeans
  clustering (no heavy embedding downloads, so CI stays fast).
- **Priority** — rule-based from declared `risk` / `severity` / `type` / `category`.

Feature engineering lives in one place (`app/features.py`) and is used at both
train and serve time to avoid train/serve skew.

## Layout

```
ml/
├── app/
│   ├── main.py          # FastAPI app + routes (/health, /score, /analyze)
│   ├── config.py        # env-driven configuration
│   ├── schemas.py       # Pydantic request/response models
│   ├── features.py      # feature engineering (shared train + serve)
│   ├── scoring.py       # heuristic + model blend, flags, priority
│   ├── analysis.py      # duplicates, clusters, coverage gaps
│   └── model_store.py   # load/hold the model artifact
├── training/
│   ├── dataset.py       # synthetic, deterministic training data
│   └── train.py         # trains + saves models/quality_model.joblib
├── tests/               # pytest suite
├── models/              # trained artifact (gitignored — retrain to create)
├── requirements.txt
├── requirements-dev.txt
├── pyproject.toml       # pytest + ruff config
└── Dockerfile
```

## Requirements

Python **3.10–3.12** recommended. scikit-learn / numpy wheels may lag on the
very newest Python; if `pip install` struggles, use the Docker image (pinned to
3.12) or a 3.12 virtual environment.

## Setup

From the `ml/` directory:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements-dev.txt
```

## Train the model

```bash
python -m training.train
```

Prints cross-validation accuracy and writes `models/quality_model.joblib`.
The service also auto-trains on startup if no artifact is found
(`QA_ML_AUTO_TRAIN=1`, the default), so this step is optional in dev.

## Run

```bash
uvicorn app.main:app --reload --port 8000
# or
python -m app.main
```

Open the interactive docs at **http://localhost:8000/docs**.

## Test & lint

```bash
pytest
ruff check .
```

## API

### `GET /health`

```json
{ "status": "ok", "service": "qa-workbench-ml", "version": "0.1.0", "modelAvailable": true }
```

### `POST /score`

Request:

```json
{
  "testCases": [ { "id": "TC-001", "title": "...", "steps": [ ... ], "...": "..." } ],
  "alpha": 0.5
}
```

Response:

```json
{
  "modelAvailable": true,
  "alpha": 0.5,
  "count": 1,
  "averageQuality": 0.82,
  "results": [
    {
      "id": "TC-001",
      "title": "...",
      "qualityScore": 0.82,
      "qualityLabel": "Excellent",
      "predictedPriority": "High",
      "flags": ["missing-test-data"],
      "modelUsed": true
    }
  ]
}
```

### `POST /analyze`

Request:

```json
{ "testCases": [ ... ], "threshold": 0.75 }
```

Response:

```json
{
  "count": 12,
  "duplicates": [ { "a": "TC-002", "b": "TC-007", "similarity": 0.91 } ],
  "clusters": [ { "label": "login, password", "testCaseIds": ["TC-001"], "size": 3 } ],
  "coverageGaps": ["No security-focused tests", "No performance tests"]
}
```

You can feed the `testCases` array straight from the Node generator's
`/api/generate` response.

## Configuration

All optional — see [`.env.example`](.env.example). Env vars:
`QA_ML_MODEL_PATH`, `QA_ML_DUP_THRESHOLD`, `QA_ML_MODEL_ALPHA`, `QA_ML_PORT`,
`QA_ML_AUTO_TRAIN`.

## Docker

```bash
docker build -t qa-workbench-ml .
docker run -p 8000:8000 qa-workbench-ml
```

The image trains and bakes the model at build time.

## CI/CD notes

Suggested pipeline stages (this service is designed to be built/deployed on its
own): install `requirements-dev.txt` → `ruff check .` → `python -m training.train`
→ `pytest` → build & push the Docker image → deploy. The active workflow lives at
[`../.github/workflows/ml.yml`](../.github/workflows/ml.yml).
