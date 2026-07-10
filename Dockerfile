FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# This image runs the batch audit pipeline (not a long-lived server), so no port
# is exposed. Provide OPENROUTER_API_KEY at runtime and pass audit args, e.g.:
#   docker run -e OPENROUTER_API_KEY=sk-... <image> --tier efficiency
ENTRYPOINT ["python", "src/audit_runner.py"]
CMD ["--help"]
