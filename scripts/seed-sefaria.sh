#!/usr/bin/env bash
# seed-sefaria.sh – Download Sefaria-Export and index into MeiliSearch
# Usage: ./scripts/seed-sefaria.sh
set -euo pipefail

# Docker Compose prefixes volume names with the project name (directory name by default)
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-$(basename "$(pwd)")}"
VOLUME_NAME="${COMPOSE_PROJECT}_sefaria_data"
MEILI_HOST="${MEILI_HOST:-http://localhost:7700}"
SEFARIA_EXPORT_URL="https://github.com/Sefaria-Project/Sefaria-Export/archive/refs/heads/master.zip"

echo "==> Sefaria data seeder"
echo "    Docker volume: $VOLUME_NAME"
echo "    MeiliSearch  : $MEILI_HOST"

echo "==> Downloading and extracting into Docker volume (this may take a while – ~2 GB)..."
docker run --rm \
  -v "${VOLUME_NAME}:/data/sefaria" \
  alpine sh -c "
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

# Call the sefaria-service index endpoint if it is running
SEFARIA_SERVICE="${SEFARIA_SERVICE:-http://localhost:8613/api/sefaria}"
echo "==> Triggering indexing via sefaria-service..."
curl -s -X POST "$SEFARIA_SERVICE/admin/reindex" \
  -H "Content-Type: application/json" \
  -d "{}" \
  && echo "==> Indexing started (runs in background)." \
  || echo "WARN: Could not reach sefaria-service – run indexing manually via POST /api/sefaria/admin/reindex"
