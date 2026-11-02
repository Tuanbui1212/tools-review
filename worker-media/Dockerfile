FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/worker-media

# Cài đặt FFmpeg để render video
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e .

EXPOSE 8103
CMD ["celery", "-A", "app.tasks.celery_app", "worker", "-Q", "media_queue", "-c", "1", "-n", "worker_media@%h", "-l", "info"]
