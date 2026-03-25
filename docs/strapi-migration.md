## Strapi → VPS database migration

This document describes how to move content from Strapi into a new PostgreSQL database on the VPS and how to wire the frontend to the new API.

### 1. Target database: PostgreSQL

- Recommended DB: **PostgreSQL** (already assumed in `docs/strapi-target-schema.sql`).
- You can adapt the SQL to MySQL/MariaDB if needed, but Postgres gives:
  - Strong relational features.
  - Native JSONB columns for flexible single-type content.
  - Mature tooling and drivers.

### 2. Create the schema

On the VPS Postgres instance, apply the schema from `docs/strapi-target-schema.sql`:

```bash
# Example using psql
psql "$DATABASE_URL" -f docs/strapi-target-schema.sql
```

This will create:

- `locales`, `pages`, `news_items`, `shows`.
- Tag tables: `tags`, `tag_synonyms`, `news_item_tags`, `show_tags`.
- `single_pages` for homepage/about/info/imprint/privacy structured content (JSONB).
- Optional `media_assets` if you want a central media registry.

### 3. Migration / seed process from Strapi JSON

Once you have run `pnpm strapi:export` and have a `backups/<timestamp>/` folder:

1. Set `STRAPI_BACKUP_ROOT` to that folder when running the import script, e.g.:

```bash
STRAPI_BACKUP_ROOT="/path/to/thfradio/backups/2026-03-16T12-34-56-789Z-full" \
DATABASE_URL="postgres://user:pass@host:5432/dbname" \
pnpm strapi:import
```

2. Wire `scripts/import-from-strapi-json.js` to your DB client:
   - Initialize a Postgres client (e.g. via `pg`, Prisma, Knex).
   - Implement the TODOs for:
     - Inserting locales into `locales` and building `localeMap` (`code` → `id`).
     - Inserting `pages`, `news_items`, `shows` using the mapping detailed in the comments.
     - Inserting `tags`/`tag_synonyms` from `tag-list.json`.
     - Inserting single-type content into `single_pages` using the full `attributes` blob as `content`.

3. ID and relation handling:
   - Preserve `strapi_id` in each table where relevant.
   - For many-to-many relations (e.g. shows ↔ tags, news ↔ tags):
     - Use the Strapi IDs to look up the correct tag and show/news rows and insert into the join tables.

4. Media paths:
   - Use `backups/<timestamp>/media-manifest.json` to map Strapi media URLs to local file paths.
   - Decide whether to:
     - Serve files directly from the VPS (e.g. via Nginx and a `/media` location), or
     - Upload them to an object store and store the resulting URLs in `picture_path`, `picture_full_width_path`, and any JSONB content fields.

### 4. New API layer for the frontend

There are two main options for the replacement API:

- **Option A (inside this repo)**: Use Next.js API routes as your data layer.
  - Pros: Lives with the frontend, simple deployment.
  - Cons: Tight coupling to the Next.js runtime.
- **Option B (separate service)**: A small Node.js service (Express/Fastify) running on the VPS.
  - Pros: Clear separation between API and frontend; can be reused by other clients.
  - Cons: Extra deployment surface.

The examples below assume **Option A** for simplicity, but the route handlers are easily portable to a separate service.

#### 4.1 API route design

Implement API routes that roughly mirror the current Strapi usage:

- `GET /api/pages?locale=xx&slug=yyy`
- `GET /api/homepage?locale=xx`
- `GET /api/about?locale=xx`
- `GET /api/news?locale=xx`
- `GET /api/news/[slug]?locale=xx`
- `GET /api/shows?locale=xx`
- `GET /api/shows/[slug]?locale=xx`
- `GET /api/tags` (or `/api/tag-list`)

Each route:

- Queries PostgreSQL using the schema above.
- Returns JSON shaped as close as practical to the existing TypeScript interfaces in `src/app/_types/ResponsesInterface.ts`, so that page components need minimal changes.

#### 4.2 Updating `_lib` helpers

Refactor the existing Strapi-bound helpers so they call the new internal API instead of Strapi:

- `src/app/_lib/pages.ts`:
  - Replace Strapi fetches with:
    - `GET ${process.env.NEXT_PUBLIC_API_URL}/api/pages?locale=${locale}&slug=${slug}`
    - `GET ${process.env.NEXT_PUBLIC_API_URL}/api/homepage?locale=${locale}`
    - `GET ${process.env.NEXT_PUBLIC_API_URL}/api/about?locale=${locale}`
  - Convert the returned shapes into the existing `PageTypes`, `HomepageTypes`, `AboutTypes`, or update those interfaces in one place if you decide to simplify.

- `src/app/_lib/news.ts`:
  - Replace:
    - `news-items` and `news` Strapi calls with:
      - `GET /api/news?locale=${locale}`
      - `GET /api/news/${slug}?locale=${locale}`

- `src/app/_lib/shows.ts`:
  - Replace:
    - `GET shows?...` calls with:
      - `GET /api/shows?locale=${locale}`
      - `GET /api/shows/${slug}?locale=${locale}`

- `src/app/_lib/tags.ts`:
  - Replace:
    - `GET tag-list?...` with:
      - `GET /api/tags` returning the `TagsList` structure.

The goal is that page components under `src/app/[locale]/**` continue using the same helper functions and types; only the backend source changes.

### 5. ISR and revalidation after Strapi

Once Strapi is removed, you can also remove the Strapi-specific webhook routes under `src/app/api/revalidate/*`.

Instead, decide how your new API/admin will trigger ISR:

- If you build a custom admin or CLI for content changes, it can:
  - Call Next.js revalidate API routes, or
  - Use `revalidatePath` / `revalidateTag` if you are on app router with on-demand revalidation.
- Alternatively, you can rely on time-based revalidation (`export const revalidate = ...`) for pages that change infrequently (as is already done for shows).

### 6. Cutover strategy (from Strapi to new API)

Use the following phases:

1. **Preparation**
   - Run `pnpm strapi:export` and confirm backups.
   - Apply `docs/strapi-target-schema.sql` to Postgres.
   - Implement and test the DB import script with a staging database.

2. **Parallel run**
   - Stand up the new Postgres DB and API (Next.js routes or separate service).
   - Create a feature branch where `_lib` helpers point to the new API.
   - Verify all key pages (home, about, shows, news, info, imprint, privacy) work correctly.

3. **Final sync and freeze**
   - Announce a short content freeze window.
   - Stop Strapi writes (or communicate to editors not to change content).
   - Run a final `pnpm strapi:export` and re-run the import script against production DB.
   - Switch environment variables to point the frontend at the new API.

4. **Decommission Strapi**
   - Keep the Strapi VM/container and SQLite DB as a read-only backup for a defined period.
   - Once you are confident everything is working and backups are safe, shut down Strapi services.

This, combined with the audit and backup docs, gives you a complete path: export all Strapi data, load it into Postgres on the VPS, cut the frontend over to the new API, and retire Strapi safely.

