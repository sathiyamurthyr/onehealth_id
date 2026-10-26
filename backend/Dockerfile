FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for PostgreSQL and healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY backend ./backend

# Create dedicated unprivileged non-root application user and group (UID/GID 10001)
# Create necessary runtime directories and ensure appuser ownership
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -d /app -M appuser && \
    mkdir -p /app/storage/documents/quarantine \
             /app/storage/documents/approved \
             /app/backend/logs && \
    chown -R 10001:10001 /app

ENV PYTHONPATH=/app
ENV PORT=8000

USER 10001:10001

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=15s \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
