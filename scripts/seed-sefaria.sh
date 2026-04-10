#!/usr/bin/env bash
# seed-sefaria.sh – Copy vendored Sefaria texts from this repo into the app's local data volume
# Usage: ./scripts/seed-sefaria.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Docker Compose prefixes volume names with the project name.
# The compose files default to `613-home`; override COMPOSE_PROJECT_NAME if your stack uses a different name.
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-613-home}"
VOLUME_NAME="${COMPOSE_PROJECT}_app_data"
SEFARIA_REPO_SOURCE="${SEFARIA_REPO_SOURCE:-${REPO_ROOT}/vendor/sefaria/texts}"

echo "==> Sefaria data seeder"
echo "    Docker volume: $VOLUME_NAME"
echo "    App endpoint : ${SEFARIA_SERVICE:-http://localhost:8613/api/sefaria}"
echo "    Repo source  : ${SEFARIA_REPO_SOURCE}"

if [[ ! -d "${SEFARIA_REPO_SOURCE}" ]]; then
  echo "ERROR: No vendored Sefaria source found at ${SEFARIA_REPO_SOURCE}"
  echo "       Add the Sefaria export under vendor/sefaria/texts before running this script."
  exit 1
fi

echo "==> Copying vendored texts into Docker volume..."
docker run --rm \
  -v "${SEFARIA_REPO_SOURCE}:/seed:ro" \
  -v "${VOLUME_NAME}:/data" \
  alpine sh -c "
    mkdir -p /data/sefaria
    if [ -f /data/sefaria/.downloaded ]; then
      echo 'Sefaria data already present, skipping copy.'
      exit 0
    fi
    rm -rf /data/sefaria/texts
    mkdir -p /data/sefaria/texts
    cp -R /seed/. /data/sefaria/texts/
    touch /data/sefaria/.downloaded
    echo 'Copy complete.'
  "

SEFARIA_SERVICE="${SEFARIA_SERVICE:-http://localhost:8613/api/sefaria}"

if [[ -n "${SEFARIA_ADMIN_TOKEN:-}" ]]; then
  echo "==> Triggering indexing via app with provided admin token..."
  curl -s -X POST "$SEFARIA_SERVICE/admin/reindex" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SEFARIA_ADMIN_TOKEN}" \
    -d "{}" \
    && echo "==> Indexing started (runs in background)." \
    || echo "WARN: Could not reach the app – sign in as an admin and use Reimport in Settings."
else
  echo "==> Data copied into the app volume."
  echo "    Sign in as an admin and use Reimport in Settings to rebuild the local search index."
  echo "    Or rerun this script with SEFARIA_ADMIN_TOKEN set to trigger indexing automatically."
fi
