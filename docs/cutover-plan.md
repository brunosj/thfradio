## Strapi cutover and decommissioning plan

This document describes the concrete steps to move from Strapi to the new PostgreSQL-backed API with minimal risk.

### Phase 1 – Preparation

1. **Freeze window planning**
   - Agree a short content freeze window with editors (e.g. 30–60 minutes).
   - Communicate that during this window, no Strapi edits should be made.

2. **Backups**
   - Run `pnpm strapi:export` to produce a fresh backup under `backups/<timestamp>/`.
   - On the Strapi host, make a raw SQLite copy and check integrity (see `docs/strapi-backup.md`).

3. **New DB and schema**
   - Provision PostgreSQL on the VPS (or another managed instance).
   - Apply `docs/strapi-target-schema.sql` to create tables.

4. **Migration scripts**
   - Implement DB writing logic in `scripts/import-from-strapi-json.js`.
   - Test against a staging database using one of the exported backup folders.

### Phase 2 – Parallel run

1. **Import into staging DB**
   - Use a Strapi backup export to populate the staging Postgres DB.
   - Verify:
     - Record counts for pages, shows, news items, tags.
     - Spot check several records for correct locales, slugs, titles, descriptions, images.

2. **New API layer**
   - Implement the new API as described in `docs/new-api-layer.md`:
     - Routes for pages, homepage, about, news, shows, tags.
   - Point the API at the staging Postgres DB.

3. **Frontend integration (feature branch)**
   - In a feature branch:
     - Update `_lib` helpers to use `NEXT_PUBLIC_API_URL` and the new API endpoints.
   - Run the site locally (or on a staging deployment) against the new API and staging DB.
   - Verify key flows:
     - Home page, about page.
     - News index + example news article.
     - Shows index + several show detail pages.
     - Any pages relying on tags/info/imprint/privacy.

4. **Fixes and alignment**
   - Adjust API response shapes or mapping logic until the frontend renders correctly without touching page components.

### Phase 3 – Final sync and content freeze

1. **Enter freeze window**
   - Notify editors that the freeze is starting.
   - Ensure no new content is created or edited in Strapi after this point.

2. **Final export from Strapi**
   - Run `pnpm strapi:export` again to capture the latest content.
   - Optionally, take one more raw SQLite backup for safety.

3. **Import into production DB**
   - Point `STRAPI_BACKUP_ROOT` at the latest backup.
   - Run the import script against the **production** Postgres DB.
   - Verify:
     - Row counts vs. Strapi admin.
     - A few spot-checked pages and shows.

4. **Switch frontend to new API**
   - Update environment variables for the production deployment:
     - Set `NEXT_PUBLIC_API_URL` (and the server-side DB URL) to point at the new API/DB.
     - Remove or ignore Strapi env vars for the live app.
   - Deploy the feature branch that uses the new API.

5. **Sanity checks**
   - Immediately test:
     - Home, about, news, shows pages.
     - Any locale variations you support.
   - Monitor logs for errors from the new API.

### Phase 4 – Decommissioning Strapi

1. **Observation period**
   - Keep Strapi and its SQLite DB online but read-only for an agreed period (e.g. 2–4 weeks).
   - Do not allow editors to use Strapi; all content changes should now happen via the new system.

2. **Clean up Strapi integrations**
   - Remove unused Strapi webhook endpoints under `src/app/api/revalidate/*`.
   - Remove Strapi-related environment variables from deployment configs and `.env` files (except where needed for historical re-exports).

3. **Shutdown**
   - After the observation period and once you’re confident in the new system:
     - Shut down Strapi containers/services.
     - Archive the final SQLite DB and the latest `backups/<timestamp>/` folder in long-term storage.

This plan, together with the audit, backup, schema, and new API docs, forms a complete path for safely migrating off Strapi and onto your new VPS-hosted database and API.

