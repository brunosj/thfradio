## New API layer to replace Strapi

This document outlines how to implement a new API on the VPS (or inside this Next.js app) that serves the same data currently coming from Strapi.

### 1. Where to put the new API

You have two main options:

- **Option A – Next.js API routes (recommended for now)**
  - Implement routes under `src/app/api/*` that talk to PostgreSQL.
  - Deploy alongside the existing app; no extra infrastructure needed.
- **Option B – Separate Node service on the VPS**
  - Create a small Express/Fastify service.
  - Expose endpoints under `/api/*` and point the frontend there via `NEXT_PUBLIC_API_URL`.

The route structure and payloads can be shared between both approaches. You can start with API routes inside Next.js and later extract them if desired.

### 2. Endpoint design

Implement the following endpoints (paths are illustrative; adapt to your routing style):

- `GET /api/pages?locale=xx&slug=yyy`
- `GET /api/homepage?locale=xx`
- `GET /api/about?locale=xx`
- `GET /api/news?locale=xx`
- `GET /api/news/[slug]?locale=xx`
- `GET /api/shows?locale=xx`
- `GET /api/shows/[slug]?locale=xx`
- `GET /api/tags`

Each endpoint should:

- Read `locale` (and `slug` where relevant) from the query/path.
- Query PostgreSQL using the schema from `docs/strapi-target-schema.sql`.
- Return JSON shaped as close as possible to the existing types in `src/app/_types/ResponsesInterface.ts` so the frontend can reuse its types and components.

### 3. Example: Next.js API route shapes

At a high level, API route handlers will:

- Parse inputs from `request.nextUrl.searchParams` or route params.
- Use a DB client (e.g. `pg` or Prisma) to query tables like `pages`, `shows`, `news_items`, `single_pages`, `tags`.
- Map DB rows into objects that match or are easily convertible to:
  - `PageTypes`
  - `HomepageTypes`
  - `AboutTypes`
  - `NewsType`
  - `ShowTypes`
  - `TagsList`

You can either:

- Keep the existing Strapi-like shape (e.g. wrapping values under `data` and `attributes`), or
- Simplify the API responses and adapt them in the `_lib` helpers before passing to components.

### 4. Updating `_lib` fetch helpers

Once the new API routes exist, refactor the Strapi helpers to use them:

- `src/app/_lib/pages.ts`
  - Replace Strapi URLs with calls to the new API, for example:
    - `fetchPageBySlug(slug, locale)` → `GET ${process.env.NEXT_PUBLIC_API_URL}/api/pages?locale=${locale}&slug=${slug}`
    - `fetchHomePage(locale)` → `GET /api/homepage?locale=${locale}`
    - `fetchAboutPage(locale)` → `GET /api/about?locale=${locale}`

- `src/app/_lib/news.ts`
  - `fetchNews(locale)` → `GET /api/news?locale=${locale}`
  - `fetchNewsArticle(slug, locale)` → `GET /api/news/${slug}?locale=${locale}`

- `src/app/_lib/shows.ts`
  - `fetchProgrammeShows(locale)` → `GET /api/shows?locale=${locale}`
  - `fetchShowBySlug(slug, locale)` → `GET /api/shows/${slug}?locale=${locale}`

- `src/app/_lib/tags.ts`
  - `fetchTags()` → `GET /api/tags`

Each helper can:

- Call the new API route.
- Adapt the response to the existing TypeScript interfaces, so the page components (e.g. under `src/app/[locale]/news`, `src/app/[locale]/shows`) do not need to change.

### 5. Environment configuration

To make the new API configurable:

- Use:
  - `NEXT_PUBLIC_API_URL` for the public base URL of the new API.
  - `DATABASE_URL` (or similar) for server-side DB connections inside the API routes or service.
- For local development:
  - You can keep `NEXT_PUBLIC_API_URL=http://localhost:3000` if the API is served by the same Next.js app.
  - For a separate service, point it to that service’s base URL instead.

### 6. Cleaning up Strapi-specific code

After the new API is in place and the frontend is switched:

- The `_lib` helpers will no longer use:
  - `process.env.STRAPI_PUBLIC_API_URL`.
  - Strapi-specific query parameters for `populate`, `filters[...]`, etc.
- You can then:
  - Remove Strapi env vars from `.env` files (except for backup purposes).
  - Remove Strapi webhook handlers under `src/app/api/revalidate/*` once they are no longer called.

This gives you a clear target for the new API surface and a small set of files to update in the frontend once the Postgres DB and import scripts are ready.

