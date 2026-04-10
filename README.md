# 613 – Self-Hostable Orthodox Jewish Suite

A fully self-hosted Docker Compose stack providing:

- **Hebcal Tools** – Jewish calendar, Zmanim, Parsha, Daf Yomi, Nach Yomi, Holidays + PDF export
- **Sefaria Reader** – Browse, search, read, highlight, and annotate Jewish texts locally (no reliance on sefaria.org)

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/) (v2)
- ~4 GB free disk space (after Sefaria data import)

### 1. Clone & configure

```bash
git clone https://github.com/Wbbdlr/613.git
cd 613
cp .env.example .env
# Edit .env to set your MEILI_MASTER_KEY and location defaults
```

### 2. Start the stack

```bash
docker compose pull
docker compose up -d
```

The UI will be available at **http://localhost** (or whatever `HTTP_PORT` you set).

### Using with Dockge

[Dockge](https://github.com/louislam/dockge) can deploy directly from the compose YAML because production services use prebuilt images from GHCR.

1. In Dockge, create/import a stack with this repo's `docker-compose.yml` content.
2. Add an `.env` for the stack (copy values from `.env.example`).
3. Click **Deploy**.

> **Optional local-source builds:** if you want to build from source, clone the full repo and run `docker compose up --build` from that repo root (the override file is auto-applied there).

### 3. Seed Sefaria data (one-time, ~2 GB download)

```bash
# Make sure the stack is running first
chmod +x scripts/seed-sefaria.sh
./scripts/seed-sefaria.sh
```

This downloads the [Sefaria-Export](https://github.com/Sefaria-Project/Sefaria-Export) dataset and triggers indexing into MeiliSearch. Indexing runs in the background and may take 10–30 minutes depending on your hardware.

## Services

| Service | Internal Port | Description |
|---|---|---|
| `proxy` | 80 / 443 | Caddy reverse proxy (entry point) |
| `frontend` | 3000 | React UI |
| `hebcal-service` | 3001 | Hebcal REST API + PDF export |
| `sefaria-service` | 3002 | Sefaria text API + notes |
| `db` | 5432 | PostgreSQL (notes, highlights, bookmarks) |
| `meilisearch` | 7700 | Full-text search engine |

## API Reference

### Hebcal Service (`/api/hebcal/...`)

| Endpoint | Method | Description |
|---|---|---|
| `/calendar/events?year=&month=&il=` | GET | Calendar events for a month |
| `/calendar/parsha?date=&il=` | GET | Parashat HaShavua for a date |
| `/calendar/holidays?year=&il=` | GET | All holidays for a year |
| `/calendar/dafyomi?date=` | GET | Daf Yomi for a date |
| `/calendar/nach?date=` | GET | Nach Yomi for a date |
| `/zmanim?lat=&lon=&tzid=&date=` | GET | Halachic times by coordinates |
| `/zmanim?city=&date=` | GET | Halachic times by city name |
| `/pdf/calendar` | POST | Download calendar as PDF |
| `/pdf/zmanim` | POST | Download zmanim table as PDF |

### Sefaria Service (`/api/sefaria/...`)

| Endpoint | Method | Description |
|---|---|---|
| `/texts/books` | GET | List all available books |
| `/texts/:book` | GET | Book metadata + chapter count |
| `/texts/:book/:chapter` | GET | Chapter text (Hebrew + English) |
| `/search?q=&limit=&book=` | GET | Full-text search |
| `/notes?ref=` | GET | Notes for a passage |
| `/notes` | POST | Create a note |
| `/notes/:id` | PUT | Update a note |
| `/notes/:id` | DELETE | Delete a note |
| `/notes/highlights?ref=` | GET | Highlights for a passage |
| `/notes/highlights` | POST | Add a highlight |
| `/notes/bookmarks` | GET | All bookmarks |
| `/notes/bookmarks` | POST | Add a bookmark |
| `/admin/reindex` | POST | Trigger Sefaria data reindex |

## Development

```bash
# Run in dev mode (hot reload, ports exposed)
docker compose up --build
```

Source code is bind-mounted in dev mode via `docker-compose.override.yml`.
For local development, the override switches the frontend target to `dev` (hot reload).
Production-style deployments, including Dockge config-only stacks, use prebuilt GHCR images by default.

## License & Data

- Application code: MIT
- Sefaria texts: [CC-BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) (Sefaria Project)
- Hebcal library: GPL-2.0

## Architecture

```
Browser
  └── Caddy (proxy)
       ├── /              → frontend:3000 (React)
       ├── /api/hebcal/*  → hebcal-service:3001 (Node.js)
       └── /api/sefaria/* → sefaria-service:3002 (Node.js)
                                ├── PostgreSQL (notes/highlights)
                                └── MeiliSearch (full-text search)
```
613 Home
