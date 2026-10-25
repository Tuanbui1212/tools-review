FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /srv/worker

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir -e .

EXPOSE 8100
CMD ["celery", "-A", "app.tasks.celery_app", "worker", "-Q", "ai,files,notify", "-l", "info"]
