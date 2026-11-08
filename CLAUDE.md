# CLAUDE.md – thfradio.de (public website)

Public website of THF Radio, a community radio at the former Tempelhof Airport gatehouse in Berlin: live player (2 channels + live video), week programme, show pages, archive of past shows (SoundCloud + old Mixcloud shows), staff picks, videos, chat.
**This repo is public and co-maintained** (repo owner = original developer; the THF owner has write access). Keep everything in it – code, commits, PRs, issues, docs – free of secrets, personal data and server internals.

## How it fits with the other THF repos
- `ayoshakorter-sys/THF_Space` – intranet **thfradio.space** (Next.js + Prisma) + streaming-server configs in `hetzner/`. It is the source of most data here (see below) and has its own CLAUDE.md.
- `ayoshakorter-sys/thf-studio-app` (studio kiosk app + THF Box) and `ayoshakorter-sys/thf-audio-lab` (THF Terminal, macOS) don't talk to this site directly.
- Old backend (NestJS/AdminJS, separate repo, `NEXT_PUBLIC_BACKEND_URL`) still serves news, page texts (home/about/info), archive tags, chat (socket.io), `/uploads/*` images (rewrite in `next.config.mjs`), stream-status fallback, and old show texts as fallback. Strapi (`cms.thfradio.com`, `STRAPI_*`) is only leftovers.

## Stack
- Next.js 15.5 App Router, React 19, TypeScript strict, pnpm 10 (pinned via `packageManager`), Node 22 on the server.
- i18n: next-intl, locales `en` (default) + `de`, always prefixed (`/en/…`, `/de/…`); strings in `messages/en.json` + `messages/de.json`; config `src/i18n/`, `src/middleware.ts` (unprefixed paths → `/en`).
- Tailwind v4 via `@tailwindcss/postcss`; theme tokens in `@theme` in `src/app/_styles/global.css`.
- State: zustand (`src/app/_hooks/useStore.ts`) + React contexts (`src/app/_context/`). Path aliases in `tsconfig.json` (`@/lib/*` = `src/app/_lib/*`, `@/modules/*`, `@/utils/*`, …).
- Layout: pages `src/app/[locale]/` (home, `shows`, `shows/[slug]`, `latest` = archive, `info`, `news`, `chat`, legal pages); API routes `src/app/api/`; data access `src/app/_lib/`; UI modules `src/app/_modules/`.

## Commands (verified against package.json / next.config.mjs)
- Install: `corepack enable && pnpm install --frozen-lockfile`
- Dev: `pnpm dev` (Turbopack, port 3000; `-p` to change)
- Build: `NEXT_PUBLIC_BACKEND_URL=https://backend.thfradio.com pnpm build` – **without that variable the build fails** ("Invalid rewrites found"). Build type-checks; ESLint is skipped in builds (`ignoreDuringBuilds`).
- Typecheck alone: `pnpm exec tsc --noEmit` – only after one `next dev`/`next build` (generates the gitignored `next-env.d.ts`).
- Lint: `pnpm lint` fails on pre-existing errors (e.g. `src/app/_modules/chat/Chat.tsx`). Lint what you touched: `pnpm exec next lint --file <path> --file <path>`.
- Tests: no unit tests. Player check (Playwright: strict-autoplay Chrome, Firefox, WebKit-as-iPhone, no-AAC case): `pnpm test:player [url]` (default `http://localhost:3005`); once: `pnpm exec playwright install chromium firefox webkit`. Run it for every player/archive/live change.

## Where the data comes from
All thfradio.space public APIs take `Authorization: Bearer <key>`; keys are created on thfradio.space (admin → timetable API keys). `INTRANET_API_KEY` falls back to `CALENDAR_2_KEY` everywhere.
- **Shows** – `src/app/_lib/shows.ts`: `/api/public/shows[/<slug>]?lang=` when `SHOWS_SOURCE=intranet`, merged with old-backend shows. Only shows switched "on website" in thfradio.space Show Management appear.
- **Programme** – `src/app/api/fetchCalendar` (ch1) / `fetchCalendar2` (ch2) via `src/app/_lib/intranetTimetable.ts` from `/api/public/timetable/{1,2}`. Ch1 falls back to the Teamup ICS feed (no key / key without ch1 / API error / empty; `CALENDAR_1_SOURCE=teamup` forces it). A non-empty intranet answer replaces Teamup completely.
- **Archive** – `/api/cloudShows` → `src/app/_lib/cloudShowsCache.ts`: SoundCloud tracks (`_lib/soundcloud.ts`) + old Mixcloud shows copied to THF's own storage (`_lib/ownArchive.ts`, `/api/public/archive`, API doc in THF_Space `docs/ARCHIVE_API.md`). Same episode on both → SoundCloud wins. Clean cover photos from `/api/public/recording-photos`. Genres tidied in `src/app/_utils/genres.ts`.
- **Playback** – `src/app/_lib/archiveAudio.ts`: own `<audio>`; SoundCloud via HLS proxy `/api/soundcloud-stream/[id]/hls` (MP3 fallback for browsers without AAC, `_lib/aacSupport.ts`); own-archive files play directly. Mixcloud widget only in rollback mode.
- **Live** – audio URLs fixed in `src/app/_lib/liveChannels.ts` (`stream.thfradio.space/live.mp3` / `live2.mp3`, `?ref=web`); live video HLS from `video.thfradio.space` (`_modules/videos/`, `/api/stream-status`).
- **Staff picks** – `_lib/picks.ts` ← `/api/public/community-picks` (community row deliberately empty for now, `src/app/[locale]/page.tsx`).
- **Videos** – `_lib/videos.ts`: which videos = YouTube channel public feed; picture = clean frame from `/api/public/videos?ids=…`.
- **Instant refresh** – thfradio.space calls `POST /api/revalidate` (`model: "show"`) and `/api/revalidate/cloudshows` with `REVALIDATE_TOKEN`; otherwise caches expire (shows 5 min, archive list 6 h).

## Environment variables (names + purpose only; values never in the repo)
`env.sample` is incomplete and has duplicate blocks – this list is from the code.
- `NEXT_PUBLIC_BACKEND_URL` – old backend base URL (required at build). `NEXT_PUBLIC_API_URL` – own base URL for server-side calls to own API routes.
- `SHOWS_SOURCE` – `intranet` | `backend` (default backend). `INTRANET_API_URL`, `INTRANET_API_KEY` – thfradio.space base + key.
- `CALENDAR_1_URL`, `CALENDAR_1_KEY`, `CALENDAR_1_SOURCE`, `CALENDAR_2_URL`, `CALENDAR_2_KEY` – programme per channel.
- `ARCHIVE_SOURCE` – `own` (default) | `mixcloud` (rollback to Mixcloud API + widget). `MIXCLOUD_API` – Mixcloud cloudcasts endpoint (rollback/fallback).
- `SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET`, `SOUNDCLOUD_USER_ID` – SoundCloud archive + stream proxy.
- `COMMUNITY_PICKS_URL`, `COMMUNITY_PICKS_KEY`, `VIDEOS_URL`, `VIDEOS_KEY`, `YOUTUBE_CHANNEL_ID` – picks + video row (keys default to `CALENDAR_2_KEY`).
- `REVALIDATE_TOKEN` – shared with thfradio.space (`WEBSITE_REVALIDATE_TOKEN` there). `STRAPI_WEBHOOK_SECRET`, `STRAPI_PUBLIC_API_URL` – legacy.

## Deploy
- Push/merge to `main` = live in ~5 min. **Not Vercel** (README is stale): `.github/workflows/deploy.yml` SSHes to the website server, `git reset --hard origin/main`, runs `scripts/deploy.sh` (pnpm install → waits for the old backend's health check → `pnpm build` in place → pm2 restart). A failed run sends a notification mail (Resend action in the workflow).
- The server builds in place: a change that doesn't build can break the live site. Build on the branch first.
- Runtime env lives in a `.env` on the server, not in GitHub. Changing it needs SSH (local-only).
- The archive list survives deploys in `.next/cache/thf-cloud-shows.json`.
- A website deploy does not touch the radio streams (served by the streaming server).

## Conventions
- Code, commits, docs: English. UI copy in both `messages/*.json`; German UI says "Programm", "Archiv".
- Commit subject = "Area: what changes for listeners", plain language (e.g. "Archive: the old Mixcloud shows play from THF Radio's own server"); body = short bullets of what/why.
- Comments explain the why in plain words (see `ownArchive.ts`, `cloudShowsCache.ts`). Match the surrounding file's formatting (Prettier defaults + tailwind plugin, no config file).
- Archive-list rules changed (filtering, genres, sources) → raise `LIST_VERSION` in `src/app/_lib/cloudShowsCache.ts`, or the server keeps serving the old list for up to 6 h.
- Cross-repo pairs, change together (one PR per repo): genre rules `src/app/_utils/genres.ts` ↔ THF_Space `lib/genre-families.ts` + `lib/soundcloud-genres.ts`; analytics event names `src/app/_lib/analytics.ts` / `listenTracking.ts` ↔ THF_Space `lib/website-events.ts`; public API shapes ↔ THF_Space `app/api/public/*`.
- Analytics: self-hosted Umami (`src/app/_lib/analytics.ts`), no cookies, loads only on thfradio.de and never inside frames. Events carry no personal data (no typed text; chat only fixed labels). Clickable areas are marked with `data-area`.

## Decisions (and why)
- thfradio.space is the single source of show info; the website only reads → no conflicts between two systems. Intranet text wins; empty fields fall back to old-backend text/images so hosts can edit them; no old show may disappear (old-backend shows are merged in). `SHOWS_SOURCE=backend` is the no-deploy rollback.
- Live streams come from THF's own streaming server (Radio Cult dropped 2026-11-05). URLs are hardcoded, not env, so a stale server `.env` can't bring the old provider back.
- Old Mixcloud shows are self-hosted (owner's decision, licensing risk accepted); 2 geo-blocked shows are left out on purpose. `ARCHIVE_SOURCE=mixcloud` is the rollback.
- Archive plays in the site's own audio element, not the SoundCloud/Mixcloud iframes → one tap starts playback, also on iPhones.
- The archive cache never replaces a good list with a failed or incomplete fetch (SoundCloud outages).
- Video list follows the public YouTube feed because the intranet's stored privacy can be out of date.
- Community picks, merch (`src/app/_lib/merch.ts`, empty) and the merch footer link stay hidden until content is ready.

## Current state / in flight (as of 2026-11-08)
- Redesign is live (since 2026-11-01). Live: shows from thfradio.space, fold-out programme, own live streams, own Mixcloud archive, Umami + listening stats.
- Branch `archive-own-files` (71eca05, on GitHub, not merged): "Archive: no Mixcloud link for old shows from our own server, Mixcloud script only when needed" (also adds `ARCHIVE_SOURCE` to `env.sample`). Next: build + player test, then PR.
- Channel 1 programme still comes from Teamup, and that is correct for now: the intranet's `/api/public/timetable/1` only serves ProgramSlot rows (on ch1 = reruns + manual booker slots), so a ch1 key today would show only reruns. First the intranet must serve Teamup's ch1 events from that endpoint; then a ch1+2 key + `CALENDAR_1_KEY` on the server (owner, local-only).
- Known bugs: the Teamup fallback (`api/fetchCalendar`) ignores RRULE (series show only their first date); `metadataBase` is unset → share image resolves to localhost; unprefixed links always go to `/en`; every page downloads the full archive JSON (~2.8 MB); React hydration error #418 on iPhone WebKit (page still loads).
- Proposals, not built: retention quick wins (live-now block, autoplay next, share fixes, sitemap…), newsletter sign-up popup (double opt-in, backend in THF_Space), supporting-member (Stripe) popup calling THF_Space's existing checkout endpoint, public listener login/favourites.
- Retiring the old backend (news, pages, chat, uploads) needs a decision with the repo owner – see the table at the end of `INTRANET_SHOWS.md`.
- Stale docs: `README.md` (Vercel/Strapi/Airtime), `QUICK_START.md`, `MIGRATION_*.md` (March 2026 backend migration). `INTRANET_SHOWS.md` (German) is current for the show sync.
- Per-topic handover notes: `docs/handover/` (public repo → public-safe content only).

## Local-only (impossible from a cloud session)
- Anything on the website server: reading/changing its `.env`, pm2, logs, Caddy, the ARCHIVE_SOURCE/SHOWS_SOURCE rollbacks, manual revalidate calls with the real token.
- Streaming-server or intranet server work (deploys in THF_Space `hetzner/`, SSH).
- Real-device checks (iPhone Safari, phones on the local Wi-Fi), the Umami admin dashboard.

## Cloud environment
- Works: `pnpm install`, `pnpm build` (with `NEXT_PUBLIC_BACKEND_URL` set; no other env needed – build-time fetches only warn), `tsc`, file-level lint, `pnpm dev`. Only 3 API routes prerender at build; all pages render on demand.
- Real data in `pnpm dev` needs keys (`CALENDAR_2_KEY`/`INTRANET_API_KEY`, SoundCloud) in the cloud environment settings – never in a committed file. Without them: ch1 falls back to Teamup, shows to the old backend, archive SoundCloud part is empty.
- `pnpm test:player` may work after `pnpm exec playwright install --with-deps chromium firefox webkit`; prefer localhost (runs against thfradio.de count as real plays in the stats).
- No SSH keys, no server `.env`, no production logs. Pushing needs GitHub access to this repo (the Claude GitHub app installed by the repo owner, or the collaborator's own token via `/web-setup`); if a push is refused, say so instead of working around it. `gh pr`/`gh issue` fail in cloud sessions (GraphQL blocked): use the built-in GitHub tools or `gh api`, and the "Create PR" button.

## Working rules
- One branch per task from `origin/main`; open a PR; the owner reviews/merges from the GitHub app. **Never commit or push to `main`** – it deploys the live site.
- Co-maintained repo: don't touch other people's branches (`feat/connect-to-new-thfradio-backend`, `hotfix/temp-schedule-archive`, `simple-chat-thf`, `radio-cult`); agree bigger changes (deploy workflow/`scripts/deploy.sh`, dependencies, backend retirement, design) with the repo owner first.
- Before a PR: build green, touched files linted, `pnpm test:player` for player changes; say in the PR what was not testable (real iPhone, prod data).
- Never print or commit key values; env values only in gitignored `.env.local` or cloud env settings.
- Talk to the owner in their language (usually German), short and plain; explain what changes for listeners.
- End of every session: update this file + the matching `docs/handover/<topic>.md`, then push the branch.
