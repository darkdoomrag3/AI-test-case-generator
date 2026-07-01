# QA Workbench ML service.
# Python 3.12 (not 3.14) so scikit-learn/numpy wheels are guaranteed available.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    QA_ML_AUTO_TRAIN=0

WORKDIR /service

# Install dependencies first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code + training code.
COPY app ./app
COPY training ./training

# Bake a trained model into the image so /score uses the ML path immediately.
RUN python -m training.train

EXPOSE 8000

# Basic container healthcheck against the liveness endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
