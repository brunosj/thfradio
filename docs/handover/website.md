# thfradio.de website – handover (as of 2026-11-08)
Goal: visitors press play at once and keep listening (live + archive), shared links and search bring new listeners, and the site reports its own errors to thfradio.space. Data comes only from thfradio.space; the old backend is retired once the repo owner agrees.
Read `CLAUDE.md` first (stack, data sources, env, deploy, rules). This file covers only what is open. "Owner" = THF owner; "repo owner" = the original developer.

## State
- Live on `main` (eaffbbb, 2026-11-05): redesign, shows + ch2 programme from thfradio.space, own live streams, own Mixcloud archive, Umami + listening stats, player rebuild.
- Player fix plan (2026-11-02) is **done** (4c98c9b + 7c096f1): own `<audio>` + HLS proxy `src/app/api/soundcloud-stream/[id]/hls/route.ts`, `src/app/_lib/archiveAudio.ts`, `src/app/_lib/hls.ts`, MediaSession (archive + live), `src/app/_modules/player/PlayerErrorBoundary.tsx`, `pnpm test:player`. The Radio Cult `?_ic2` part is obsolete (Radio Cult is gone). Only open bit: a check on a real iPhone (tested with Playwright WebKit only).
- Branch `archive-own-files` (71eca05, on GitHub, 1 commit on top of eaffbbb, **no PR yet**). The owner asked for it on 2026-11-06 ("remove the Mixcloud link"). What it does:
  - `CloudPlayer.tsx`: no "Mixcloud ↗" link for old shows played from THF's own server (SoundCloud shows keep theirs). Only browsers without AAC still get the Mixcloud page as a way out.
  - The Mixcloud widget script loads only while the list contains Mixcloud shows (`ARCHIVE_SOURCE=mixcloud` or thfradio.space unreachable).
  - `env.sample`: `ARCHIVE_SOURCE` + how to roll back. `scripts/player-check.mjs`: checks "no Mixcloud link" and "no Mixcloud script loaded".
  - Tested locally by that session (player check + rollback), not re-checked since.
- Retention plan (2026-11-06, written only): the owner wanted the plan first, then the quick wins as a preview to look at. Nothing of packages 1–4 is built yet. The current numbers (Umami, listening stats in thfradio.space → Streaming → Control room) are the before-measurement.
- Checked on the live site on 2026-11-08: `og:image` = `http://localhost:3000/thfradio_seo.jpg`; `/api/cloudShows` = 2.85 MB (410 KB gzip); `/robots.txt` and `/sitemap.xml` → 307 to `/en/…`.

## Tried and rejected
- Newsletter "show once" by IP: rejected (shared IPs, phone vs laptop, storing IPs = personal data). Use browser storage instead (counts as technically necessary, no banner).
- Merging thfradio.de into the THF_Space codebase (like alte-feuerwache-thf.de): rejected 2026-10-28, because an intranet failure would take the public site down. Proposed instead: one shared login.
- Batch-updating all radio directories at once: no such service exists. Each directory has to be updated by hand.
- SoundCloud/Mixcloud iframes for playback: replaced; they need a second tap and crashed on switching.

## Open bugs
- **Ch1 programme still from Teamup** (`x-calendar-source: teamup`). The server key only allows ch2. Careful: thfradio.space `/api/public/timetable/1` reads only `ProgramSlot` rows (THF_Space `lib/timetable-public-api.ts`). Channel 1 rows there are reruns and manual booker slots (`lib/rerun-scheduler.ts`); regular ch1 shows live in Teamup. A non-empty answer replaces Teamup completely, so setting a ch1 key today would likely show **only reruns** (unverified with a real key). The intranet must serve Teamup's ch1 events first.
- **RRULE ignored** in the Teamup fallback `src/app/api/fetchCalendar/route.ts` (`fetchFromTeamup`): it filters on `event.start` only. A series whose first date lies before the window disappears, and a series starting inside it shows only the first date (seen with a weekly show missing on 12.11).
- **Share image** resolves to localhost: no `metadataBase` (`src/app/layout.tsx`). `og:url` is always the homepage (`src/app/_utils/metadata.ts`). Show pages without an image get the bare `CMS_URL` as image (`src/app/[locale]/shows/[slug]/page.tsx`). `<html>` has no `lang`.
- **Unprefixed links → `/en`** regardless of browser language (`src/middleware.ts` own redirect).
- **Full archive JSON on every page**: `DataProvider` in the root layout fetches it on mount (`src/app/_context/DataContext.tsx`).
- **False empty state**: `src/app/[locale]/shows/[slug]/page.client.tsx:306` shows "Noch keine Sendungen im Archiv" before loading starts (`isLoadingShows` is still false on first render).
- **React hydration error #418** ("text didn't match") on `/en` in Playwright WebKit-as-iPhone, also before 7c096f1. The page still loads. Not reproduced on a real iPhone. Hypotheses (unverified): time-dependent text rendered on the server (ticker/programme in UTC vs Berlin), or iOS auto-detecting phone numbers/dates (`<meta name="format-detection" content="telephone=no">`).

## Next steps
1. [cloud] Open a PR `archive-own-files` → `main` (in the cloud via the built-in GitHub tools / `gh api` / "Create PR" button – `gh pr` fails there, see CLAUDE.md). Before that: build + `pnpm test:player` on localhost. [owner] merge. If package 3 later loads the archive lazily, `mixcloudInList` in `CloudPlayer.tsx` needs a small server flag instead of the full list.
2. [cloud] **Package 1 – quick wins**, branch `retention-quick-wins` from `origin/main`, one PR with Playwright screenshots (1440 px + iPhone 390 px, `/de?live=on` and `?live=off`), because the owner can't open a local preview. [owner] review/merge.
   - A. New `src/app/_modules/live-now/LiveNowHero.tsx`, first block in `src/app/[locale]/page.client.tsx`.
     - Live: show image, "LIVE auf THF1" with pulsing dot, show name linked, time, "Danach: …", big play button. Both channels live → two compact rows.
     - Nothing live: "THF Radio Archiv" + play, then "Nächste Live-Show: X · Fr 20:00".
     - Data: `useCalendarData` (`src/app/_hooks/useCalendarStore.ts`). Move now/next logic out of `src/app/_modules/live-ticker/liveTickerUtils.tsx` (`findCurrentShow`/`findNextShow`) into one shared function used by ticker and hero.
     - Play through the same path as `src/app/_modules/live-radio/LiveStreamPlayButton.tsx` (so listening stats count), `data-area='live-hero'`.
     - Dev-only `?live=on|off` switch; remove before go-live.
   - B. Ticker (`LiveChannelRow.tsx`, `LiveTicker.tsx`, `live-radio/LiveStreamPlayButton.tsx`): show name links to the show page when `showSlug` is known, ≥40×40 px tap area, "Live Now" text from `messages/*.json`. If `liveStreamAudio.ts` fails, show "Stream gerade nicht erreichbar" briefly.
   - C. Touch play icon: `src/app/_common/ui/ShowCard.tsx:71` and `src/app/_modules/picks/PickCard.tsx:81` add `[@media(hover:none)]:opacity-100 [@media(hover:none)]:scale-100`. Paused cards show a pause icon. `PicksSection.tsx` heading "Staff Picks · tippen zum Hören" (messages).
   - D. Autoplay next, new `src/app/_lib/playNext.ts` `pickNext(current, cloudShows)`:
     - order: next older episode of the same show (`showMatcher` in `src/app/_utils/guests.ts`, `processShows` in `src/app/_utils/showUtils.ts`), else the newest unplayed episode of the same genre family (`genreFamilies` in `src/app/_utils/genres.ts`); skip episodes already played this session;
     - start it from the `ended` listener in `archiveAudio.ts` (~l.123) via `trackIdSet` + `setCurrentShowUrl` (same `<audio>`, so no autoplay block);
     - `CloudPlayer.tsx` row "Als Nächstes: Show · Datum" + "Überspringen", 15 s countdown with "Abbrechen";
     - `mediaSession.setActionHandler('nexttrack')`;
     - stats: start origin `autoplay` / `skip` via `archiveLoading(id, area)` in `listenTracking.ts`; event names unchanged (THF_Space `lib/website-events.ts` reads them).
   - E. Empty state: `cloudShows === null` = loading (spinner) in the show page (l.306), `ShowsDirectory.tsx`, `HomeArchiveSection.tsx`.
   - F. Sharing:
     - `metadataBase: new URL('https://thfradio.de')` and `<html lang={locale}>`: root layout, or set it from `src/app/[locale]/layout.tsx`;
     - `createMetadata` gets a `path` → `og:url` + `alternates.canonical` (+ hreflang en/de), fallback image when empty or only `CMS_URL`;
     - homepage title not "THF Radio | THF Radio";
     - show description: markdown stripped, ~160 chars.
   - G. Language: drop the manual `/en` redirect in `src/middleware.ts` so next-intl's locale detection (cookie/Accept-Language) decides. Check: `curl -sI -H "Accept-Language: de-DE" localhost:3000/shows` → `/de/shows`.
3. [cloud] RRULE fix in `fetchFromTeamup`:
   - for events with `rrule`: `event.rrule.between(bounds.start, bounds.end, true)`, keeping the duration;
   - skip `exdate`, apply `recurrences` overrides;
   - check DST correctness (Europe/Berlin);
   - test by forcing `CALENDAR_1_SOURCE=teamup` locally (the Teamup ICS feed is public, no key needed).
4. [cloud] **Package 2 – discover more**:
   - card titles link to the show page; genre chips filter `/latest?genre=…`;
   - show page: "Ähnliche Shows" (same genre family) and "Jetzt live" when the show is on air;
   - per-episode link `/latest?play=<id>` + share button; filter/search kept in the URL;
   - "Weiterhören": last episode + position in `localStorage` (try/catch);
   - live in the bottom player bar with show name + image, show name on the lock screen.
5. [cloud] **Package 3 – speed + search** (overlaps with the open bugs):
   - archive JSON: drop the duplicate `tags`/`pictures` fields (~half the size); fetch only on pages that need it (lazy `useData()`); show page/home get server-rendered slices from `cloudShowsCache.ts`; raise `LIST_VERSION`;
   - smaller images (`images.unoptimized: true` in `next.config.mjs`), lazy loading on staff picks, fonts TTF → WOFF2 (~330 → ~120 KB);
   - `src/app/sitemap.ts` (both locales, show pages), `src/app/robots.ts`, JSON-LD (`RadioStation`, `RadioSeries`); exclude `robots.txt|sitemap.xml` from the middleware matcher/redirect;
   - the fullscreen chat shouldn't reopen by itself on the next visit (`src/app/_context/ChatContext.tsx`).
6. [cloud] **Package 4 – keep listeners coming back**:
   - "Erinnern" on the next broadcast (.ics / Google Calendar link);
   - web app manifest for the phone home screen;
   - "N Leute im Chat" on the closed chat button;
   - the News footer link shows content from Nov 2025 → hide it or keep news current [owner].
7. [cloud] **Error reporting** to the thfradio.space ErrorLog → daily digest → GitHub issues in the private intranet repo. Build after the intranet endpoint exists (THF_Space `docs/handover/errors-and-monitoring.md`); details below.
8. [owner] Decisions/inputs, see "Proposals" below. Then [cloud] builds them.
9. [owner+intranet] Ch1 switch: first make THF_Space `/api/public/timetable/1` return Teamup's ch1 events (reruns already exist there as Teamup events, so dedupe). Then [owner] create a ch1+2 key (thfradio.space admin → timetable API keys) and [local] set `CALENDAR_1_KEY` in the server `.env`. Then compare one week against Teamup.
10. [cloud, agree with repo owner] Stale docs: rewrite `README.md` (says Vercel/Strapi/Airtime), drop or move `QUICK_START.md` and `MIGRATION_COMPLETE.md`/`MIGRATION_SUMMARY.md` (March 2026 migration) to `docs/history/`, check `SOUNDCLOUD_SETUP.md`, untrack `next.log` (a March 2026 dev log) and add it to `.gitignore`.
11. [owner] Branch `video/mobile-player-buffering` (11d1276) is superseded: its `VideoStreamPopup.tsx` no longer exists, the live video now lives in `_modules/videos/`. Delete it once the owner OKs.

## Error reporting – website side (design, not built)
- Client hooks:
  - `src/app/[locale]/error.tsx` (segment boundary, EN/DE "reload" UI, sends `error.digest`);
  - `src/app/global-error.tsx` (own `<html><body>`);
  - `PlayerErrorBoundary.componentDidCatch`;
  - a small client component next to `<Analytics />` in `src/app/layout.tsx` with `window` `error` + `unhandledrejection` listeners.
  - Report only on thfradio.de hosts, never inside frames (same rule as `Analytics.tsx`).
- Client sending: `src/app/_lib/reportError.ts` dedupes (message + first stack line), max 5 per page load, `navigator.sendBeacon('/api/report-error')`.
  - Drop noise: browser extensions / foreign script URLs, `ResizeObserver loop`, `AbortError`, offline messages (`Load failed`, `Failed to fetch`).
- Own route `src/app/api/report-error/route.ts`:
  - validates and truncates (message 500, stack 4000 chars), strips query strings and hashes from every URL (they can carry `?token=`);
  - in-memory rate limit per IP; the IP itself is never forwarded;
  - forwards server-to-server with `Authorization: Bearer <key>`; always answers 204.
- Server hooks:
  - `src/instrumentation.ts` `onRequestError(err, request, context)` (Next 15) for uncaught server/route errors; skip not-found/redirect digests;
  - plus `reportServerError(where, err, 'warning')` in handled catches: `api/fetchCalendar` falling back to Teamup, `cloudShowsCache.ts` fetch failures, `shows.ts` intranet → backend fallback, `soundcloud-stream/[id]/hls` errors;
  - send the same key at most once per 15 min.
- Key: server-only env (never `NEXT_PUBLIC_*`). Simplest is reusing `INTRANET_API_KEY` if the intranet accepts it for this endpoint (then no server `.env` change); otherwise a new `ERROR_REPORT_KEY` [local]. Endpoint/key names come from the intranet doc; proposal `POST ${INTRANET_API_URL}/api/public/website-errors`.
  - Don't call the intranet's `/api/log-error` from the browser: no CORS headers found for thfradio.de (unverified).
- Map to ErrorLog fields:
  - `page` (path without query), `component`, `functionName`, `apiRoute`, `errorMessage`, `errorStack`;
  - `errorCode` (`CLIENT_ERROR` | `UNHANDLED_REJECTION` | `SERVER_ERROR` | digest), `userAgent`;
  - `metadata` JSON: `{ source: 'thfradio.de', locale, release }`.
  - Never `userId`/`userEmail`, cookies, chat text/nicknames, form input (newsletter e-mails) or request bodies.
- Test in the cloud: point `INTRANET_API_URL` at a local mock HTTP server that prints the bodies, run `pnpm dev`, and throw test errors (client + route).

## Proposals waiting for the owner
- **Newsletter popup** (2026-11-06):
  - Idea: shows after ~20 s or some scrolling, centred on desktop / bottom sheet on phones, player keeps playing; closes with X/Esc/outside click; remembered in `localStorage`, never shown again; a small permanent form in the footer + info page.
  - Website side: `src/app/_modules/newsletter/`, an own route forwarding to thfradio.space `/api/newsletter/subscribe` (no CORS there, unverified), a honeypot field.
  - Gaps on the intranet side: no double opt-in (instant sign-up) and one list per e-mail (the first site wins).
  - Open questions: (1) separate radio list with an "also Feuerwache events" checkbox? (recommended: yes); (2) double opt-in right away? (recommended: yes).
  - Also needs a newsletter + mail-provider paragraph in the privacy text.
- **Supporting-member popup**: THF_Space `POST /api/external/foerdermitglied/checkout`
  - body `{name, email, amountCents ≥ 200, successUrl, cancelUrl}` → `{url}` (Stripe Checkout); success/cancel URLs must be on thfradio.de/www;
  - answers 503 until Stripe is set up on the intranet → fall back to the mailto;
  - website: form/popup (preset amounts), call it through an own API route, a thanks page, replace the footer "Support us" mailto (`contactMenu` in `messages/*.json`);
  - estimate ½–1 day. [owner] Stripe account, keys, webhook, PayPal check (intranet env).
- **Listener login / favourites** (estimate 2026-10-28):
  - one login run by thfradio.space (magic link), ♥ on show pages, accounts for listener / supporting member / member;
  - prerequisites: a central role lock on intranet routes (many check only "logged in", +2–3 days), captcha, account deletion + privacy text;
  - estimate 1–2 weeks + favourites 2–4 days;
  - open decision: may the intranet also run under a thfradio.de subdomain (shared cookie)? Recommended order: supporting-member popup first. The show-sync prerequisite is done (live 2026-11-01).
- **Retiring the old backend** (owner + repo owner): what it still serves is in the table at the end of `INTRANET_SHOWS.md`.
  - Counts (2026-10-29): 24 news, 9 pages, home/about texts, 21 tags. All easy to move (thfradio.space already has a bilingual page editor for the Feuerwache site).
  - The chat is the hard part: it needs a server holding WebSocket connections. Options: old backend for chat only / small own service / hosted realtime service.
- **Umami privacy text**: the privacy page text comes from the old backend (`fetchPageBySlug('privacy')`), so it is edited in its admin [owner].
  - [cloud] can draft EN+DE: self-hosted Umami, no cookies, nothing stored in the browser, click heatmap (sampled), listening events without personal data, legal basis to be confirmed.
- **Merch / community picks**: hidden on purpose (`src/app/_lib/merch.ts` `MERCH_ITEMS = []`, community row `[]` in `src/app/[locale]/page.tsx:48`). Merch waits for photos + store product links; community picks wait for the owner's go.
- **Radio directories** (owner asked 2026-11-05):
  - radio-browser.info entry "THF" still has the old provider URL and can't be edited via API; only a new entry (`POST /json/add`) with `https://stream.thfradio.space/live.mp3` is possible, and needs the owner's OK;
  - Radio Garden and FMSTREAM are updated by hand via their forms [owner];
  - the old URL still plays the programme for now.
- [owner] Check that thfradio.space has `WEBSITE_REVALIDATE_URL` + `WEBSITE_REVALIDATE_TOKEN` set (unverified). Without them, hidden shows stay on the site up to 6 h.

## Files and commands
- See CLAUDE.md for build/dev/lint/`pnpm test:player`. Live checks without keys:
  - `curl -s https://thfradio.de/en | grep -o '<meta property="og:[^>]*>'`
  - `curl -sI https://thfradio.de/robots.txt`
  - `curl -s --compressed https://thfradio.de/api/cloudShows | wc -c`
  - `curl -sI https://thfradio.de/api/fetchCalendar | grep -i x-calendar-source`
- Cross-repo: thfradio.space `lib/timetable-public-api.ts`, `app/api/newsletter/subscribe/route.ts`, `app/api/external/foerdermitglied/checkout/route.ts`, `prisma/schema.prisma` `model ErrorLog`, `lib/website-events.ts`.

## Local-only
- Server `.env` changes (`CALENDAR_1_KEY`, a possible `ERROR_REPORT_KEY`), pm2, logs, rollbacks.
- Real iPhone checks (hydration #418, autoplay next, popups), the Umami dashboard, the old-backend admin (privacy text).
- Screenshots and `pnpm test:player` do work in the cloud; with real data only if keys are set in the cloud env.
