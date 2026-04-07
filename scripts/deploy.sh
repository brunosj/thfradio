#!/bin/bash

set -e

echo "🚀 Starting deployment process..."

export PATH=/home/web/.nvm/versions/node/v22.21.1/bin:$HOME/.nvm/versions/node/v22.21.1/bin:$HOME/.local/share/pnpm:$PATH

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# PM2 process name for this Next.js app (override on the server if needed)
PM2_APP_NAME="${PM2_APP_NAME:-frontend}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:3011/health}"

echo "📂 Deploying from: $REPO_ROOT"

echo "📦 Installing dependencies..."
pnpm install --silent 2>/dev/null || pnpm install

echo "=========================================="
echo "STEP 1: Wait for backend (for SSG / build-time fetches)"
echo "=========================================="

echo "Checking backend health at: $BACKEND_HEALTH_URL"

for i in {1..60}; do
  if RESPONSE=$(curl -sf "$BACKEND_HEALTH_URL" 2>&1); then
    echo "✅ Backend is ready!"
    echo "   Health check response: $RESPONSE"
    break
  fi

  if [ "$i" -eq 60 ]; then
    echo "❌ Backend failed to respond in time (60 seconds)"
    echo ""
    echo "Testing health endpoint:"
    curl -v "$BACKEND_HEALTH_URL" 2>&1 | head -20
    echo ""
    echo "Backend PM2 status:"
    pm2 list
    echo ""
    echo "Backend logs (last 50 lines):"
    pm2 logs backend --lines 50 --nostream
    exit 1
  fi

  if [ $((i % 5)) -eq 0 ]; then
    echo "Waiting for backend... (attempt $i/60)"
  fi

  sleep 1
done

echo "=========================================="
echo "STEP 2: Build Next.js (in repo)"
echo "=========================================="
pnpm build

echo "=========================================="
echo "STEP 3: Run PM2 app: $PM2_APP_NAME"
echo "=========================================="
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  echo "📌 No PM2 process named '$PM2_APP_NAME' — starting it (pnpm start)..."
  pm2 start pnpm --name "$PM2_APP_NAME" --cwd "$REPO_ROOT" -- start
fi
pm2 save

echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
echo "📊 Process status:"
pm2 list --no-color | grep -E "id|backend|$PM2_APP_NAME|─"
