#!/usr/bin/env bash
# seed-sefaria.sh – Download Sefaria-Export and index into MeiliSearch
# Usage: ./scripts/seed-sefaria.sh [data-dir]
set -euo pipefail

DATA_DIR="${1:-./sefaria-data}"
MEILI_HOST="${MEILI_HOST:-http://localhost:7700}"
MEILI_KEY="${MEILI_MASTER_KEY:-masterKey}"
SEFARIA_EXPORT_URL="https://github.com/Sefaria-Project/Sefaria-Export/archive/refs/heads/master.zip"

echo "==> Sefaria data seeder"
echo "    Data dir : $DATA_DIR"
echo "    MeiliSearch : $MEILI_HOST"

mkdir -p "$DATA_DIR"

if [ ! -f "$DATA_DIR/.downloaded" ]; then
  echo "==> Downloading Sefaria-Export (this may take a while – ~2 GB)..."
  TMP_ZIP="$DATA_DIR/sefaria-export.zip"
  curl -L --progress-bar "$SEFARIA_EXPORT_URL" -o "$TMP_ZIP"
  echo "==> Extracting..."
  unzip -q "$TMP_ZIP" -d "$DATA_DIR"
  mv "$DATA_DIR/Sefaria-Export-master" "$DATA_DIR/texts" 2>/dev/null || true
  rm "$TMP_ZIP"
  touch "$DATA_DIR/.downloaded"
  echo "==> Download complete."
else
  echo "==> Sefaria data already downloaded, skipping."
fi

# Call the sefaria-service index endpoint if it is running
SEFARIA_SERVICE="${SEFARIA_SERVICE:-http://localhost:3002}"
echo "==> Triggering indexing via sefaria-service..."
curl -s -X POST "$SEFARIA_SERVICE/admin/reindex" \
  -H "Content-Type: application/json" \
  -d "{}" \
  && echo "==> Indexing started (runs in background)." \
  || echo "WARN: Could not reach sefaria-service – run indexing manually via POST /admin/reindex"
