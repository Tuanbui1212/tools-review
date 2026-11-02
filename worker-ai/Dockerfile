FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/worker-ai

# Cài đặt các thư viện hệ thống cần cho OpenCV và xử lý ảnh
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e .

EXPOSE 8102
CMD ["celery", "-A", "app.tasks.celery_app", "worker", "-Q", "ai_queue", "-c", "2", "-n", "worker_ai@%h", "-l", "info"]
