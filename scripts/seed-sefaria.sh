#!/usr/bin/env bash
# seed-sefaria.sh – Download Sefaria-Export and index into the app's local search DB
# Usage: ./scripts/seed-sefaria.sh
set -euo pipefail

# Docker Compose prefixes volume names with the project name.
# The compose files default to `613-home`; override COMPOSE_PROJECT_NAME if your stack uses a different name.
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-613-home}"
VOLUME_NAME="${COMPOSE_PROJECT}_app_data"
SEFARIA_EXPORT_URL="https://github.com/Sefaria-Project/Sefaria-Export/archive/refs/heads/master.zip"

echo "==> Sefaria data seeder"
echo "    Docker volume: $VOLUME_NAME"
echo "    App endpoint : ${SEFARIA_SERVICE:-http://localhost:8613/api/sefaria}"

echo "==> Downloading and extracting into Docker volume (this may take a while – ~2 GB)..."
docker run --rm \
  -v "${VOLUME_NAME}:/data" \
  alpine sh -c "
    mkdir -p /data/sefaria
    if [ -f /data/sefaria/.downloaded ]; then
      echo 'Sefaria data already present, skipping download.'
      exit 0
    fi
    apk add --quiet --no-cache curl unzip
    echo 'Downloading Sefaria-Export...'
    curl -L --progress-bar '${SEFARIA_EXPORT_URL}' -o /tmp/sefaria.zip
    echo 'Extracting...'
    unzip -q /tmp/sefaria.zip -d /data/sefaria
    mv /data/sefaria/Sefaria-Export-master /data/sefaria/texts 2>/dev/null || true
    rm /tmp/sefaria.zip
    touch /data/sefaria/.downloaded
    echo 'Download complete.'
  "

# Call the app index endpoint if it is running
SEFARIA_SERVICE="${SEFARIA_SERVICE:-http://localhost:8613/api/sefaria}"
echo "==> Triggering indexing via app..."
curl -s -X POST "$SEFARIA_SERVICE/admin/reindex" \
  -H "Content-Type: application/json" \
  -d "{}" \
  && echo "==> Indexing started (runs in background)." \
  || echo "WARN: Could not reach the app – run indexing manually via POST /api/sefaria/admin/reindex"
