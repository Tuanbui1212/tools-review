FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/worker-io

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e .

EXPOSE 8101
CMD ["celery", "-A", "app.tasks.celery_app", "worker", "-Q", "io_queue", "-c", "8", "-n", "worker_io@%h", "-l", "info"]
