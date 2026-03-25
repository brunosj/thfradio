## Strapi backup and export

This project includes a helper script to export **all Strapi content and media** into a versioned `backups/` folder. Use this as part of the migration away from Strapi and as a safety net before decommissioning the Strapi instance.

### 1. Prerequisites

- Node 18+ on the machine running the export (for global `fetch` and streams).
- Network access from that machine to your Strapi instance.
- Optional but recommended: a Strapi **API token** with read access to all content types.

Required environment variables:

- `STRAPI_PUBLIC_API_URL` – e.g. `https://cms.thfradio.com/api/`
- `CMS_URL` – e.g. `https://cms.thfradio.com` (used to turn relative media URLs into absolute ones)
- `STRAPI_API_TOKEN` – (optional) Strapi API token for authenticated export

### 2. Running the export

From the repo root:

```bash
cd thfradio

STRAPI_PUBLIC_API_URL="https://cms.thfradio.com/api/" \
CMS_URL="https://cms.thfradio.com" \
STRAPI_API_TOKEN="your_token_if_needed" \
pnpm strapi:export
```

This runs `node scripts/strapi-export.js` and will create a new timestamped folder under `./backups`, for example:

- `backups/2026-03-16T12-34-56-789Z-full/`
  - `json/`
    - `pages.json`
    - `news-items.json`
    - `news.json`
    - `shows.json`
    - `tag-list.json`
    - `homepage.json`
    - `about.json`
  - `media/`
    - `asset-1.jpg`
    - `asset-2.png`
    - ...
  - `media-manifest.json`

### 3. What gets exported

- **Collection types**
  - `pages`
  - `news-items`
  - `news`
  - `shows`
  - `tag-list`
- **Single types**
  - `homepage`
  - `about`
- **Media**
  - The script scans all exported JSON for Strapi media objects and:
    - Resolves relative URLs using `CMS_URL` (or `STRAPI_PUBLIC_API_URL` as a fallback).
    - Downloads each asset into `backups/<timestamp>/media/asset-N.ext`.
    - Records a mapping in `media-manifest.json` of:
      - Original Strapi relative URL → absolute URL → local file path.

### 4. SQLite raw backup (on the Strapi host)

In addition to the JSON + media export, you should take a **raw SQLite backup** directly on the server where Strapi runs:

1. SSH into the Strapi host.
2. Stop Strapi or ensure no writes are happening.
3. Locate the SQLite file (commonly something like `./data.db` or `./database/strapi.db` depending on your setup).
4. Copy it with a timestamped filename, e.g.:

```bash
cp data.db data-$(date +%Y%m%d-%H%M%S).db
sqlite3 data-$(date +%Y%m%d-%H%M%S).db "PRAGMA integrity_check;"
```

5. Store this DB file alongside the exported JSON/media (for example, in an off‑repository backup location).

### 5. Validation checklist

After running an export, validate that:

- Each JSON file under `backups/<timestamp>/json/`:
  - Contains records matching or exceeding the counts reported by Strapi admin UI for the corresponding collection.
- `media-manifest.json`:
  - Has entries for all media used in `NewsType`, `ShowTypes`, `HomepageTypes`, and `AboutTypes`.
- The raw SQLite backup:
  - Passes `PRAGMA integrity_check`.

With this in place you have:

- A **structured, portable export** of all Strapi content used by the THF Radio site.
- A **complete media archive** suitable for re‑hosting on the VPS or an object store.
- A **raw DB snapshot** you can fall back to if you need to inspect or re‑export data later.

