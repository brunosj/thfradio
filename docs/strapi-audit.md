## Strapi content audit for THF Radio

### 1. Environment and configuration

- **Strapi base URLs and secrets**
  - `STRAPI_PUBLIC_API_URL` → base for all REST calls (e.g. `https://cms.thfradio.com/api/`).
  - `CMS_URL` → base URL for building absolute media URLs (e.g. `https://cms.thfradio.com`).
  - `NEXT_PUBLIC_CMS_URL` → local CMS URL used on the frontend (`http://localhost:1337` in `env.sample`).
  - `STRAPI_WEBHOOK_SECRET` → shared secret used by Strapi webhooks to trigger Next.js revalidation.
- **Frontend API URLs (post‑migration)**
  - `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_FRONTEND_URL` are already present for the new stack and currently point at `http://localhost:3003`.

### 2. Strapi REST endpoints used by the app

All Strapi access is via plain `fetch` calls, constructed from `process.env.STRAPI_PUBLIC_API_URL`:

- **Pages (`pages` collection type)**
  - File: `src/app/_lib/pages.ts`
  - Endpoint:
    - `GET ${STRAPI_PUBLIC_API_URL}pages?locale=${locale}&populate=*`
  - Usage:
    - `fetchPageBySlug(slug, locale)` fetches **all pages** for a locale, then filters client‑side:
      - `page.attributes.slug === slug`
  - Consumers:
    - `src/app/[locale]/news/page.tsx` → `fetchPageBySlug('news', locale)` for page metadata/content.
    - `src/app/[locale]/shows/page.tsx` → `fetchPageBySlug('shows', locale)` for the shows index page.
    - Other informational pages (e.g. `info`, `imprint`, `privacy`) are likely modelled as `pages` with corresponding slugs, even though they are not directly shown in the snippets above.

- **Homepage (`homepage` single type)**
  - File: `src/app/_lib/pages.ts`
  - Endpoint:
    - `GET ${STRAPI_PUBLIC_API_URL}homepage?locale=${locale}&populate=*`
  - Usage:
    - `fetchHomePage(locale)` returns a `HomepageTypes` object or `null` on failure.
  - Consumers:
    - The locale root page under `src/app/[locale]/page.tsx` (not shown here, but inferred from usage) should use this helper for home content.
  - Notes:
    - Uses `populate=*`, so all nested sections (hero, shows, news, programme, archive, picture gallery) are loaded in one request.

- **About (`about` single type)**
  - File: `src/app/_lib/pages.ts`
  - Endpoint:
    - `GET ${STRAPI_PUBLIC_API_URL}about?locale=${locale}&populate[page][populate]=*&populate[radioSection][populate]=*&populate[torhausSection][populate]=*&populate[heroPictures][populate]=*&populate[imageBanner][populate]=*&populate[codeOfConduct][populate]=*`
  - Usage:
    - `fetchAboutPage(locale)` returns an `AboutTypes` object or `null` on failure.
  - Consumers:
    - The about page under `src/app/[locale]/about/page.tsx` (path inferred from type usage and revalidation routes).
  - Notes:
    - This is a deeply nested structure: page meta, hero text and pictures, radio and torhaus sections, an image banner, and a code of conduct slider.

- **News items (`news-items` collection type)**
  - File: `src/app/_lib/news.ts`
  - Endpoint:
    - `GET ${STRAPI_PUBLIC_API_URL}news-items?locale=${locale}&populate=*&sort=createdAt:desc`
  - Usage:
    - `fetchNews(locale)` returns a list of `NewsType` items sorted newest‑first.
  - Consumers:
    - `src/app/[locale]/news/page.tsx`:
      - Combines `fetchPageBySlug('news', locale)` and `fetchNews(locale)` to render a news index.

- **News article (`news` collection type)**
  - File: `src/app/_lib/news.ts`
  - Endpoint:
    - `GET ${STRAPI_PUBLIC_API_URL}news?locale=${locale}&filters[slug][$eq]=${slug}&populate=*`
  - Usage:
    - `fetchNewsArticle(slug, locale)` returns the **first** matched article.
  - Consumers:
    - The per‑article news page (e.g. `src/app/[locale]/news/[slug]/page.tsx`) is expected to call this helper.

- **Shows (`shows` collection type)**
  - File: `src/app/_lib/shows.ts`
  - Endpoints:
    - List:
      - `GET ${STRAPI_PUBLIC_API_URL}shows?locale=${locale}&populate=*`
      - Used by `fetchProgrammeShows(locale)` to list all shows for the programme page.
    - Single by slug:
      - `GET ${STRAPI_PUBLIC_API_URL}shows?locale=${locale}&filters[slug][$eq]=${slug}&populate=*`
      - Used by `fetchShowBySlug(slug, locale)` to fetch a show for its detail page.
  - Consumers:
    - `src/app/[locale]/shows/page.tsx`:
      - Uses `fetchProgrammeShows(locale)` for the grid of shows.
    - `src/app/[locale]/shows/[slug]/page.tsx`:
      - Uses `fetchShowBySlug(slug, locale)` to render a show detail page and build metadata.
  - Static generation (commented):
    - `src/app/[locale]/shows/[slug]/page.tsx` contains commented `generateStaticParams` logic that would hit:
      - `GET ${STRAPI_PUBLIC_API_URL}shows?locale=all&populate=localizations`
      - and expand `localizations.data` to prebuild slug/locale combinations.

- **Tags (`tag-list` + `tag` relation)**
  - File: `src/app/_lib/tags.ts`
  - Endpoint:
    - `GET ${STRAPI_PUBLIC_API_URL}tag-list?populate[tag][populate]=*`
  - Usage:
    - `fetchTags()` returns a `TagsList` object with a list of tag entries and synonyms.
  - Consumers:
    - Used where tag filters or tag lists appear (e.g. homepage sections, show/news filtering).

### 3. TypeScript interfaces that mirror Strapi content

File: `src/app/_types/ResponsesInterface.ts`

These interfaces describe the shape of Strapi responses as currently consumed by the app:

- **`PageTypes`**
  - Structure:
    - `id: number`
    - `attributes: PageComponent & { localizations?: { data: LocalizationType[] } }`
  - `PageComponent`:
    - `id`, `title`, `description`, `slug`.
  - Used for:
    - General pages (news page, shows page, and likely info/imprint/privacy pages).

- **`NewsType`**
  - `attributes`:
    - `title`, `text`, `date`, `slug`, `summary`.
    - `picture` → media relation:
      - `data.id`, `data.attributes.name`, `data.attributes.url`.
    - `locale`.
    - Optional `shows?: ShowTypes[]` relation.
    - Optional `localizations?: { data: LocalizationType[] }`.
  - Directly reflects the `news-items` or `news` schema in Strapi and is used on news listing and detail pages.

- **`ShowTypes`**
  - `id: number`
  - `attributes`:
    - Text/meta:
      - `title`, `description`, `slug`, `keyword`, `teaserSentence`, `activeShow`, `locale`, `url`.
    - Schedule:
      - `startTime`, `endTime`, `frequency`, `day`.
    - External links:
      - `instagram`, `soundcloud`, `mail`.
    - Media:
      - `picture` and `pictureFullWidth`:
        - Each is a media relation: `data.id`, `data.attributes.name`, `data.attributes.url`.
    - Localization:
      - `localizations?: { data: LocalizationType[] }`.
  - Used:
    - In the shows listing and detail pages for programme information and metadata (including OG images via `CMS_URL` + image URL).

- **`HomepageTypes`**
  - `attributes`:
    - `page: PageComponent & { localizations?: { data: LocalizationType[] } }`.
    - `heroText: string`.
    - `heroPictures`: gallery of images (each with `attributes.url`).
    - Section blocks:
      - `shows`, `news`, `programme`, `archive`: all of type `HomepageSection`.
    - `pictureGallery`: additional gallery of images (each with `attributes.url`).
    - Optional `localizations`.
  - `HomepageSection`:
    - `title`, `subtitle`, `text`.
    - Optional:
      - `showListings?: ShowTypes[]`.
      - `calendarEntries?: CalendarEntry[]`.
      - `shows?: CloudShowTypes[]` (Mixcloud/Soundcloud).
      - `tagsList?: TagsList`.

- **`AboutTypes`**
  - `attributes`:
    - `page: PageComponent & { localizations?: { data: LocalizationType[] } }`.
    - `heroText: string`.
    - `heroPictures`: gallery similar to homepage.
    - `acceptApplications: boolean`.
    - `radioSection` and `torhausSection`: `AboutSection`.
    - `imageBanner`: single image (`attributes.url`).
    - `codeOfConduct: TextSlide[]`.
    - Optional `localizations`.
  - `AboutSection`:
    - `title`, `description`.
    - `acceptApplications?: boolean`.
    - `button`: array of call‑to‑action buttons with `text`, `path`, and a constrained `color` union.
    - `links`: relation to a list of link groups with `title` and `links` fields.

- **`TagsList` and `TagTypes`**
  - `TagsList`:
    - `attributes: { tag: TagTypes[] }`.
  - `TagTypes`:
    - `name: string`.
    - `synonyms: { name: string }[]`.
  - Used to power tag filters and display.

- **Localization and shared structures**
  - `LocalizationType`:
    - `id`, `attributes.slug`, `attributes.locale`.
  - `CalendarEntry`, `PictureType`, `Pictures`, `TextSlide` define smaller reused blocks.

### 4. Frontend routes and their Strapi dependencies

#### `/[locale]/news`

- File: `src/app/[locale]/news/page.tsx`
- Dependencies:
  - `fetchPageBySlug('news', locale)` → `pages` collection.
  - `fetchNews(locale)` → `news-items` collection.
- Data used:
  - From `PageTypes`:
    - `page.attributes.title`, `page.attributes.description` for metadata and headings.
  - From `NewsType`:
    - `title`, `summary`/`text`, `date`, `slug`, `picture.attributes.url`, and `locale`.

#### `/[locale]/shows`

- File: `src/app/[locale]/shows/page.tsx`
- Dependencies:
  - `fetchPageBySlug('shows', locale)` → `pages`.
  - `fetchProgrammeShows(locale)` → `shows`.
- Data used:
  - `page.attributes.title`, `description` for page header and meta.
  - From each `ShowTypes`:
    - `title`, `description`, `slug`, `keyword`, `teaserSentence`, scheduling fields, social links, and show images.

#### `/[locale]/shows/[slug]`

- File: `src/app/[locale]/shows/[slug]/page.tsx`
- Dependencies:
  - `fetchShowBySlug(slug, locale)` → `shows`.
  - `CMS_URL` to prefix `pictureFullWidth`/`picture` URLs for metadata.
- Data used:
  - `content.attributes.title`, `description`, and hero/OG image (`pictureFullWidth` or `picture`).
  - Other `ShowTypes` fields are rendered in `ShowContent`.
- Static params (currently commented):
  - Would use `shows?locale=all&populate=localizations` to generate all slug/locale combinations.

#### Home and about/info/imprint/privacy pages

- Home:
  - Expected route: `src/app/[locale]/page.tsx`.
  - Dependency: `fetchHomePage(locale)` → `homepage` single type.
  - Uses `HomepageTypes` structure for hero content, show/news sections, programme/archive blocks, and picture galleries.
- About:
  - Expected route: `src/app/[locale]/about/page.tsx`.
  - Dependency: `fetchAboutPage(locale)` → `about` single type.
  - Uses `AboutTypes` structure for hero section, radio/torhaus sections, code of conduct, and banner.
- Info/imprint/privacy:
  - Static routes inferred from revalidation handlers:
    - `/info`, `/imprint`, `/privacy`.
  - Likely backed by `pages` entries with slugs `info`, `imprint`, `privacy` and a `locale` field, rendered in corresponding route files.

### 5. Webhooks and ISR revalidation coupling

Strapi uses webhooks with `STRAPI_WEBHOOK_SECRET` to trigger route revalidation:

- **News revalidation**
  - File: `src/app/api/revalidate/news.ts`
  - Behavior:
    - Validates `secret` query param against `process.env.STRAPI_WEBHOOK_SECRET`.
    - Parses `req.body` as JSON and reads `attributes.slug`.
    - If `slug` is present:
      - `res.revalidate(`/news/${slug}`)`.
    - Always:
      - `res.revalidate('/news')`.
- **Home revalidation**
  - File: `src/app/api/revalidate/home.ts`
  - Behavior:
    - Validates `secret`.
    - `res.revalidate('/')`.
- **Info revalidation**
  - File: `src/app/api/revalidate/info.ts`
  - Behavior:
    - Validates `secret`.
    - `res.revalidate('/info')`.
- **Imprint revalidation**
  - File: `src/app/api/revalidate/imprint.ts`
  - Behavior:
    - Validates `secret`.
    - `res.revalidate('/imprint')`.
- **Privacy revalidation**
  - File: `src/app/api/revalidate/privacy.ts`
  - Behavior:
    - Validates `secret`.
    - `res.revalidate('/privacy')`.

### 6. Summary of Strapi content model required for migration

Based on current usage in the Next.js app:

- **Collection types**
  - `pages`
    - At least entries for: `news`, `shows`, and likely `info`, `imprint`, `privacy`, possibly others.
    - Fields: `id`, `title`, `description`, `slug`, `locale`, `localizations`.
  - `news-items`
    - Structured news entries used on the `/news` index.
    - Fields: `title`, `text`, `date`, `slug`, `summary`, `picture` (media), `locale`, optional `shows` relation, `localizations`.
  - `news`
    - Used for fetching a single news article by `slug`; may be equivalent to or separate from `news-items`.
  - `shows`
    - Radio shows/programmes with schedule, hero imagery, and localization:
      - `title`, `description`, `slug`, `keyword`, `teaserSentence`, `activeShow`, `locale`, `url`, schedule fields, social links, `picture`, `pictureFullWidth`, `localizations`.
  - `tag-list`
    - Appears as a container for:
      - `attributes.tag: TagTypes[]`.
  - `tag`
    - Implicit relation used via `tag-list`:
      - `name`, list of `synonyms`.

- **Single types**
  - `homepage`
    - Uses `HomepageTypes` with `page`, `heroText`, `heroPictures`, section blocks (shows/news/programme/archive), and `pictureGallery`.
  - `about`
    - Uses `AboutTypes` with `page`, `heroText`, `heroPictures`, `acceptApplications`, `radioSection`, `torhausSection`, `imageBanner`, `codeOfConduct`.

- **Media and assets**
  - Image usage is spread across:
    - News `picture`.
    - Shows `picture` and `pictureFullWidth`.
    - Homepage hero and gallery pictures.
    - About hero and banner pictures.
  - All media URLs are expected to be relative (e.g. `/uploads/...`) and are turned into absolute URLs by prefixing with `CMS_URL` when needed (e.g. for OG images on show pages).

This audit can be used as the authoritative reference when designing the new database schema and API so that every field currently used from Strapi has a clear home and migration path in the new stack.

