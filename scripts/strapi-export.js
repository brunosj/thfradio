/* Strapi full export script
 *
 * Usage (from repo root):
 *   STRAPI_PUBLIC_API_URL="https://cms.thfradio.com/api/" \ 
 *   STRAPI_API_TOKEN="your_token_if_needed" \
 *   CMS_URL="https://cms.thfradio.com" \
 *   node scripts/strapi-export.js
 *
 * This will create a timestamped folder under ./backups containing:
 *   - json/*.json   – raw JSON for each content type
 *   - media/*       – downloaded media files
 *   - media-manifest.json – mapping of Strapi media URLs to local file paths
 *
 * Notes:
 * - Requires Node 18+ (for global fetch and native streams).
 * - STRAPI_API_TOKEN is optional; if omitted, only public content will be exported.
 */

const fs = require('fs');
const path = require('path');

// Load .env from project root so STRAPI_PUBLIC_API_URL / CMS_URL are available
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const STRAPI_BASE = process.env.STRAPI_PUBLIC_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';
const CMS_URL = process.env.CMS_URL || '';

if (!STRAPI_BASE) {
  console.error('STRAPI_PUBLIC_API_URL is required.');
  process.exit(1);
}

const CONTENT_TYPES = [
  // collection types
  'pages',
  'news-items',
  'news',
  'shows',
  'tag-list',
  // single types
  'homepage',
  'about',
];

function createBackupDirs() {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const root = path.join(process.cwd(), 'backups', `${date}-full`);
  const jsonDir = path.join(root, 'json');
  const mediaDir = path.join(root, 'media');
  fs.mkdirSync(jsonDir, { recursive: true });
  fs.mkdirSync(mediaDir, { recursive: true });
  return { root, jsonDir, mediaDir };
}

async function strapiFetch(endpoint) {
  const url = `${STRAPI_BASE.replace(/\/$/, '/')}${endpoint.replace(/^\//, '')}`;
  const headers = { 'Content-Type': 'application/json' };
  if (STRAPI_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed Strapi request ${url} – ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function exportCollectionType(type, jsonDir) {
  console.log(`Exporting collection type: ${type}`);
  const pageSize = 100;
  let page = 1;
  let allData = [];

  // Strapi v4 supports pagination[page] & pagination[pageSize]
  // We also request populate=* to mirror frontend usage.
  // If locales are used, they will be included in the data.
  // Adjust filters if needed later.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = `/${type}?pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate=*`;
    const json = await strapiFetch(query);
    const data = json.data || [];
    allData = allData.concat(data);
    const meta = json.meta && json.meta.pagination;
    if (!meta || page >= meta.pageCount) {
      break;
    }
    page += 1;
  }

  const outPath = path.join(jsonDir, `${type.replace(/\//g, '_')}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ type, data: allData }, null, 2), 'utf8');
  console.log(`  → Saved ${allData.length} records to ${outPath}`);
  return allData;
}

async function exportSingleType(type, jsonDir) {
  console.log(`Exporting single type: ${type}`);
  const json = await strapiFetch(`/${type}?populate=*`);
  const outPath = path.join(jsonDir, `${type.replace(/\//g, '_')}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ type, data: json.data || null }, null, 2), 'utf8');
  console.log(`  → Saved single record to ${outPath}`);
  return json.data || null;
}

function collectMediaUrlsFromNode(node, urls = new Set()) {
  if (!node || typeof node !== 'object') return urls;

  if (
    node.url &&
    typeof node.url === 'string' &&
    (node.mime || node.provider || node.hash) // heuristic for Strapi file
  ) {
    urls.add(node.url);
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((item) => collectMediaUrlsFromNode(item, urls));
    } else if (value && typeof value === 'object') {
      collectMediaUrlsFromNode(value, urls);
    }
  }

  return urls;
}

async function downloadMedia(urls, mediaDir) {
  const manifest = {};
  let index = 0;

  for (const relUrl of urls) {
    // Keep only the original/largest variant for each asset.
    // Strapi generates variants prefixed with small_/medium_/large_/thumbnail_.
    const urlPath = relUrl.split('?')[0];
    const baseName = urlPath.split('/').pop() || '';
    const variantPrefixes = ['small_', 'medium_', 'large_', 'thumbnail_'];
    const isVariant = variantPrefixes.some((p) => baseName.startsWith(p));
    if (isVariant) {
      continue;
    }

    index += 1;
    const absoluteUrl =
      relUrl.startsWith('http://') || relUrl.startsWith('https://')
        ? relUrl
        : `${CMS_URL || STRAPI_BASE.replace(/\/$/, '')}${relUrl.startsWith('/') ? relUrl : `/${relUrl}`}`;

    const originalName = baseName || `asset-${index}`;
    const filename = originalName;
    const targetPath = path.join(mediaDir, filename);

    try {
      console.log(`Downloading media: ${absoluteUrl}`);
      const res = await fetch(absoluteUrl);
      if (!res.ok) {
        console.warn(`  ! Failed to download ${absoluteUrl} – ${res.status} ${res.statusText}`);
        continue;
      }

      // Node 18+ fetch returns a web stream, not a Node stream; use arrayBuffer instead of .pipe
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(targetPath, buffer);

      manifest[relUrl] = {
        absoluteUrl,
        localPath: path.relative(process.cwd(), targetPath),
      };
    } catch (err) {
      console.warn(`  ! Error downloading ${absoluteUrl}:`, err.message);
    }
  }

  return manifest;
}

async function main() {
  const { root, jsonDir, mediaDir } = createBackupDirs();
  console.log(`Backing up Strapi data to: ${root}`);

  // We only use `news-items` for news in the frontend; `/api/news` does not exist
  const collectionTypes = ['pages', 'news-items', 'shows', 'tag-list'];
  const singleTypes = ['homepage', 'about'];

  const allRecords = {};

  for (const type of collectionTypes) {
    allRecords[type] = await exportCollectionType(type, jsonDir);
  }

  for (const type of singleTypes) {
    allRecords[type] = await exportSingleType(type, jsonDir);
  }

  // Collect media URLs from all exported data
  const mediaUrls = new Set();
  for (const type of Object.keys(allRecords)) {
    const data = allRecords[type];
    if (Array.isArray(data)) {
      data.forEach((record) => {
        if (record && record.attributes) {
          collectMediaUrlsFromNode(record.attributes, mediaUrls);
        }
      });
    } else if (data && data.attributes) {
      collectMediaUrlsFromNode(data.attributes, mediaUrls);
    }
  }

  console.log(`Found ${mediaUrls.size} unique media URLs. Starting download...`);
  const manifest = await downloadMedia(mediaUrls, mediaDir);

  const manifestPath = path.join(root, 'media-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Media manifest saved to ${manifestPath}`);

  console.log('Strapi export completed.');
}

main().catch((err) => {
  console.error('Strapi export failed:', err);
  process.exit(1);
});

