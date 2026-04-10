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
# Optional for first boot, but recommended in production so you replace default secrets
```

### 2. Start the stack

```bash
docker compose pull
docker compose up -d
```

The stack publishes the proxy on **http://SERVER_IP:8613** by default, or whatever `HTTP_PORT` you set in `.env`. You can expose that port directly or point Cloudflared, Caddy, Nginx Proxy Manager, or another reverse proxy at it.
By default it pulls the `stable` image channel; set `IMAGE_TAG` in `.env` if you want to pin a different published tag such as a versioned release tag.
The compose files default the project name to `613-home`, but Dockge may still show container and volume names based on the stack name you choose in its UI.

### Optional: Repo-Build Deployment

If you want to avoid any container registry dependency, deploy from a checked-out repo and use [docker-compose.repo-build.yml](/workspaces/613/docker-compose.repo-build.yml):

```bash
docker compose -f docker-compose.repo-build.yml up -d --build
```

This builds `frontend`, `hebcal-service`, and `sefaria-service` locally on the target host. It is suitable for Dockge repo-backed stacks, but not for a pasted single-file stack because the build contexts must exist on disk.

### Optional: Remote-Build Single File

If your Docker / Dockge environment supports Git build contexts, you can use [docker-compose.remote-build.yml](/workspaces/613/docker-compose.remote-build.yml) as a single-file deployment that builds directly from GitHub without pre-cloning the repo and without pulling app images from GHCR.

```bash
docker compose -f docker-compose.remote-build.yml up -d --build
```

Set `GIT_REF` if you want to pin a tag or branch, for example `GIT_REF=v1.0.1`. This mode is slower than registry-backed deploys and depends on Compose/BuildKit support for remote Git contexts.

### Using with Dockge

[Dockge](https://github.com/louislam/dockge) can deploy this stack directly from a single pasted compose file. The production stack no longer depends on external config files; it writes the Caddy config and Postgres init SQL inside the containers at startup.

For public Dockge deployments, the GHCR packages must be publicly readable. After the first publish, set each package to **Public** in GitHub Packages if they are not already public: `613-frontend`, `613-db`, `613-hebcal-service`, and `613-sefaria-service`.

1. In Dockge, paste [docker-compose.yml](/workspaces/613/docker-compose.yml) as the stack definition.
2. Add an `.env` only if you want to override defaults, especially `MEILI_MASTER_KEY`, `JWT_SECRET`, or `IMAGE_TAG`.
3. Point your external tunnel or reverse proxy at the published host port, default `8613`.
4. Click **Deploy**.

If your Dockge stack is repo-backed instead of pasted YAML, you can use [docker-compose.repo-build.yml](/workspaces/613/docker-compose.repo-build.yml) instead and skip GHCR entirely.
If your Dockge environment supports remote Git build contexts, you can also use [docker-compose.remote-build.yml](/workspaces/613/docker-compose.remote-build.yml) as a single pasted file and set `GIT_REF` to the version you want to build.

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
| `proxy` | 8613 | Caddy reverse proxy (internal entry point) |
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
Production-style deployments, including Dockge repo-backed stacks, use prebuilt GHCR images by default.
Production-style deployments from a single Dockge compose file also work because required config is generated at container startup.

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
