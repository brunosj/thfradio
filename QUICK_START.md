# 🚀 NestJS Backend + Website Migration - Quick Start

## Prerequisites

- Node.js 18+ with npm or pnpm
- PostgreSQL database
- Both repositories cloned locally

## Step 1: Setup NestJS Backend

```bash
cd thfradio-backend

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local

# Configure database connection in .env.local
# DATABASE_URL=postgresql://user:password@localhost:5432/thfradio

# Run database migrations
pnpm run db:migrate

# (Optional) Seed initial data if available
pnpm run db:seed

# Start backend in development mode
pnpm run start:dev
```

Backend should be running at: `http://localhost:3001`

Verify with:

```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

## Step 2: Setup Website Frontend

```bash
cd thfradio

# Install dependencies
pnpm install

# Setup environment variables
# Copy env.sample to .env.local and add backend URL:
echo 'NEXT_PUBLIC_BACKEND_URL=http://localhost:3001' >> .env.local

# Start website in development mode
pnpm run dev
```

Website should be running at: `http://localhost:3000`

## Step 3: Verify API Calls

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Navigate website pages**

You should see requests to:

- `http://localhost:3001/shows` - Show listings
- `http://localhost:3001/events` - Calendar events
- `http://localhost:3001/content/news` - News items
- `http://localhost:3001/cloud-shows` - Cloud shows
- etc.

❌ You should **NOT** see requests to:

- `https://cms.thfradio.com` (Strapi)
- `/api/cloudShows` (old Next.js route)
- `/api/fetchCalendar` (old Next.js route)

## Environment Variables

### Website (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Keep these for development, can be removed in production
LANGUAGE_DEFAULT=en
LIVE_RADIO_STREAM=https://thf-radio-7ec0e6ee.radiocult.fm/stream
NEXT_PUBLIC_LIVE_RADIO_STREAM=https://thf-radio-7ec0e6ee.radiocult.fm/stream
```

### Backend (.env.local)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/thfradio

# Soundcloud (for streaming)
SOUNDCLOUD_CLIENT_ID=your_client_id
SOUNDCLOUD_CLIENT_SECRET=your_secret
SOUNDCLOUD_USER_ID=your_user_id

# Mixcloud (optional, for cloud shows)
MIXCLOUD_API=https://api.mixcloud.com/thfradio/cloudcasts/

# Server
PORT=3001
NODE_ENV=development
```

## Testing API Endpoints

### Shows

```bash
curl http://localhost:3001/shows?lang=en
curl http://localhost:3001/shows/jazz-nights?lang=en
curl http://localhost:3001/shows/search?q=jazz&lang=en
```

### Events/Calendar

```bash
curl http://localhost:3001/events?lang=en
curl http://localhost:3001/events?lang=en&from=2026-03-19&to=2026-04-02
```

### Content

```bash
curl http://localhost:3001/content/homepage?lang=en
curl http://localhost:3001/content/about?lang=en
curl http://localhost:3001/content/pages
curl http://localhost:3001/content/news?lang=en
```

### Cloud Shows

```bash
curl http://localhost:3001/cloud-shows
curl http://localhost:3001/cloud-shows/soundcloud/stream?trackId=123456789
```

### Health Check

```bash
curl http://localhost:3001/health
```

## Troubleshooting

### Backend won't start

```bash
# Check database connection
pg_isready -h localhost -p 5432

# Check port 3001 is free
lsof -i :3001

# Run migrations
pnpm run db:migrate

# View database logs
pnpm run db:studio
```

### Frontend shows errors

1. Check `NEXT_PUBLIC_BACKEND_URL` is set
2. Check backend is running: `curl http://localhost:3001/health`
3. Check browser console (F12) for errors
4. Check backend logs for database/API errors

### API returns empty data

1. Verify data exists in database: `pnpm run db:studio`
2. Check language parameter: `?lang=en` or `?lang=de`
3. Check if database migrations ran: `pnpm run db:migrate`
4. Try seeding data: `pnpm run db:seed`

### CORS errors

The backend should have CORS enabled by default. Check `src/main.ts` for CORS configuration.

## Production Deployment

### Backend

1. Build: `pnpm run build`
2. Run: `pnpm run start:prod`
3. Ensure DATABASE_URL points to production database
4. Set NODE_ENV=production

### Website

1. Update `NEXT_PUBLIC_BACKEND_URL` to production API URL
2. Build: `pnpm run build`
3. Run: `pnpm run start`

## Monitoring

### Backend Logs

```bash
# Development (with hot-reload)
pnpm run start:dev

# Watch database
pnpm run db:studio

# Check health endpoint
curl http://localhost:3001/health
```

### Website Logs

```bash
# Development server
pnpm run dev

# Check Network tab in DevTools for API calls
```

## Documentation

- **Backend API Reference:** `thfradio-backend/src/API_REFERENCE.ts`
- **Migration Guide:** `thfradio-backend/API_MIGRATION_GUIDE.md`
- **Endpoints:** `thfradio-backend/API_ENDPOINTS.md`
- **Frontend Changes:** `thfradio/MIGRATION_COMPLETE.md`

## Next Steps

- [ ] Run both backend and frontend
- [ ] Test all pages load correctly
- [ ] Verify API calls in Network tab
- [ ] Test search functionality
- [ ] Test Soundcloud audio player
- [ ] Test calendar export (ICS)
- [ ] Verify multilingual support (?lang=de)
- [ ] Check for console errors
- [ ] Performance test with DevTools
- [ ] Remove old Next.js API routes (if desired)

---

**Good to go! 🎉**
