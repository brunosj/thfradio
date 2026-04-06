# Frontend Migration to NestJS Backend - Completed ✅

## Summary

Successfully migrated the thfradio website frontend to use the NestJS backend instead of Strapi CMS and Next.js API routes.

## Files Updated

### Library Files (`src/app/_lib/`)

| File          | Changes                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------- |
| `shows.ts`    | ✅ Cloud shows now call `/cloud-shows` instead of Mixcloud/Soundcloud directly           |
| `shows.ts`    | ✅ Programme shows now call `GET /shows?lang=locale` instead of Strapi                   |
| `shows.ts`    | ✅ Show by slug now calls `GET /shows/:slug?lang=locale` instead of Strapi               |
| `news.ts`     | ✅ News list now calls `GET /content/news?lang=locale` instead of Strapi                 |
| `news.ts`     | ✅ News article now calls `GET /content/news/:slug?lang=locale` instead of Strapi        |
| `pages.ts`    | ✅ Fetch page by slug now calls `GET /content/pages/:slug?lang=locale` instead of Strapi |
| `pages.ts`    | ✅ Homepage now calls `GET /content/homepage?lang=locale` instead of Strapi              |
| `pages.ts`    | ✅ About page now calls `GET /content/about?lang=locale` instead of Strapi               |
| `tags.ts`     | ✅ Tags now call `GET /content/tags` instead of Strapi                                   |
| `calendar.ts` | ✅ Calendar now calls `GET /events?lang=locale` instead of Next.js `/api/fetchCalendar`  |

### Components

| File                                    | Changes                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `_modules/player/CustomAudioPlayer.tsx` | ✅ Soundcloud stream now calls `/cloud-shows/soundcloud/stream?trackId=X` |
| `_modules/player/CustomAudioPlayer.tsx` | ✅ Show details now call `/cloud-shows/soundcloud/details?url=X`          |

### Configuration

| File         | Changes                                                        |
| ------------ | -------------------------------------------------------------- |
| `env.sample` | ✅ Added `NEXT_PUBLIC_BACKEND_URL` variable for NestJS backend |
| `env.sample` | ✅ Marked Strapi variables as deprecated with notice           |

---

## Configuration Required

Add to your `.env.local` file:

```env
# NestJS Backend URL (required)
NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"
# or in production:
# NEXT_PUBLIC_BACKEND_URL="https://api.thfradio.com"
```

---

## API Endpoint Mapping

### Shows

```
OLD: GET /shows -> Strapi
NEW: GET /shows?lang=en -> NestJS

OLD: GET /shows?filters[slug][$eq]=jazz-nights -> Strapi
NEW: GET /shows/jazz-nights?lang=en -> NestJS
```

### Calendar/Events

```
OLD: GET /api/fetchCalendar -> Next.js API route
NEW: GET /events?lang=en -> NestJS
```

### News

```
OLD: GET /news-items?locale=en -> Strapi
NEW: GET /content/news?lang=en&limit=20 -> NestJS

OLD: GET /news?filters[slug][$eq]=article -> Strapi
NEW: GET /content/news/article?lang=en -> NestJS
```

### Pages

```
OLD: GET /pages?locale=en -> Strapi
NEW: GET /content/pages/:slug?lang=en -> NestJS

OLD: GET /homepage?locale=en -> Strapi
NEW: GET /content/homepage?lang=en -> NestJS

OLD: GET /about?locale=en -> Strapi
NEW: GET /content/about?lang=en -> NestJS
```

### Tags

```
OLD: GET /tag-list -> Strapi
NEW: GET /content/tags -> NestJS
```

### Cloud Shows

```
OLD: GET /api/cloudShows -> Next.js (Mixcloud/Soundcloud direct)
NEW: GET /cloud-shows -> NestJS (unified proxy)

OLD: GET /api/soundcloud-stream?trackId=X -> Next.js
NEW: GET /cloud-shows/soundcloud/stream?trackId=X -> NestJS

OLD: GET /api/show-details?url=X -> Next.js
NEW: GET /cloud-shows/soundcloud/details?url=X -> NestJS
```

---

## Key Improvements

### ✅ Simplification

- Removed direct Strapi integration from frontend
- Removed direct Mixcloud/Soundcloud integration from frontend
- Single backend URL to manage

### ✅ Unified Language Support

- All endpoints now use `?lang=en` (consistent across all APIs)
- No more Strapi-specific query formats

### ✅ Multilingual Content

- JSONB-based translations in database
- Backend extracts localized content automatically
- Fallback to English if language not available

### ✅ Caching Strategy

- Next.js fetch caching: 5-10 minutes for most content
- In-memory cache for calendar data
- Backend handles database queries efficiently

### ✅ Error Handling

- Consistent error responses from NestJS
- Frontend gracefully handles 404 and errors
- Fallback values (e.g., widget player for Soundcloud)

---

## Testing Checklist

- [ ] Cloud shows load from `/cloud-shows`
- [ ] Shows page displays shows from `/shows`
- [ ] Show detail page works with `/shows/:slug`
- [ ] Calendar events display from `/events`
- [ ] News items show from `/content/news`
- [ ] All pages load with correct language
- [ ] Soundcloud player works with stream/widget
- [ ] Homepage and About page render correctly
- [ ] Tags display for show filtering
- [ ] No console errors for missing APIs

---

## Next Steps

1. **Start NestJS Backend** (if not running)

   ```bash
   cd thfradio-backend
   npm install
   npm run db:migrate
   npm run db:seed # if you have seed data
   npm run start:dev
   ```

2. **Configure Frontend Environment**

   ```bash
   cd thfradio
   # Add NEXT_PUBLIC_BACKEND_URL to .env.local
   echo 'NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"' >> .env.local
   ```

3. **Test Frontend**

   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

4. **Monitor Network Requests**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Verify requests go to NestJS backend (localhost:3001)

---

## Migration Status

| Component          | Status  | Notes                                       |
| ------------------ | ------- | ------------------------------------------- |
| Shows API          | ✅ Done | Using new `/shows` endpoint                 |
| Calendar/Events    | ✅ Done | Using new `/events` endpoint                |
| News               | ✅ Done | Using new `/content/news` endpoint          |
| Pages              | ✅ Done | Using new `/content/pages` endpoint         |
| Homepage           | ✅ Done | Using new `/content/homepage` endpoint      |
| About              | ✅ Done | Using new `/content/about` endpoint         |
| Tags               | ✅ Done | Using new `/content/tags` endpoint          |
| Cloud Shows        | ✅ Done | Using new `/cloud-shows` endpoint           |
| Soundcloud Stream  | ✅ Done | Using new `/cloud-shows/soundcloud/stream`  |
| Soundcloud Details | ✅ Done | Using new `/cloud-shows/soundcloud/details` |
| Authentication     | ⏳ TODO | Not implemented yet                         |
| User Profiles      | ⏳ TODO | Not implemented yet                         |

---

## Troubleshooting

### Shows/Pages not loading?

1. Check NestJS backend is running: `http://localhost:3001/health`
2. Verify `NEXT_PUBLIC_BACKEND_URL` is set in `.env.local`
3. Check frontend console for errors (F12)
4. Check backend logs for database/query errors

### CORS errors?

1. Ensure NestJS has CORS enabled for frontend domain
2. Check backend main.ts file for CORS configuration

### Empty data?

1. Verify data exists in NestJS database
2. Check language parameter is correct: `?lang=en` or `?lang=de`
3. Run `npm run db:seed` if using seed data

### Soundcloud stream not working?

1. Widget player should still work as fallback
2. Check SOUNDCLOUD_CLIENT_ID is set in backend .env
3. Verify track is publicly available on Soundcloud

---

## Backend Verification

Make sure NestJS backend is properly set up:

```bash
# Check health
curl http://localhost:3001/health

# Check shows endpoint
curl http://localhost:3001/shows?lang=en

# Check calendar
curl http://localhost:3001/events?lang=en

# Check news
curl http://localhost:3001/content/news?lang=en
```

All should return JSON responses without errors.

---

## Rollback Plan

If you need to roll back to Strapi:

1. Revert the library file changes
2. Remove `NEXT_PUBLIC_BACKEND_URL` from .env.local
3. Restore `STRAPI_PUBLIC_API_URL` and other Strapi env vars
4. Restart frontend: `npm run dev`

---

**Migration completed on:** March 19, 2026
**Backend URL:** Configurable via `NEXT_PUBLIC_BACKEND_URL`
**Status:** ✅ Ready for testing
