/* Import Strapi JSON export into the new database.
 *
 * This script is a template: wire it up to your DB client of choice
 * (e.g. pg/Prisma/Knex) and adjust mappings as needed.
 *
 * Expected JSON source: files under backups/<timestamp>/json/ generated
 * by scripts/strapi-export.js.
 */

const fs = require('fs');
const path = require('path');

// Configure path to a specific backup folder
const BACKUP_ROOT =
  process.env.STRAPI_BACKUP_ROOT ||
  path.join(process.cwd(), 'backups', 'LATEST-REPLACE-ME');

function readJson(file) {
  const fullPath = path.join(BACKUP_ROOT, 'json', file);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  console.log(`Reading Strapi export from: ${BACKUP_ROOT}`);

  // TODO: initialize DB client here (e.g. pg.Pool, Prisma client, etc.)

  // Example: import locales
  // Derive locales from any collection that has attributes.locale
  const pages = readJson('pages.json').data || [];
  const shows = readJson('shows.json').data || [];
  const newsItems = readJson('news-items.json').data || [];

  const localeCodes = new Set();
  for (const record of [...pages, ...shows, ...newsItems]) {
    const loc = record?.attributes?.locale;
    if (loc) localeCodes.add(loc);
  }

  console.log('Locales found in export:', Array.from(localeCodes));
  // TODO: insert into locales table and build a mapping: code -> id

  // Example: map pages
  // for (const page of pages) {
  //   const attrs = page.attributes;
  //   const localeId = localeMap[attrs.locale];
  //   await db.query(
  //     'INSERT INTO pages (strapi_id, locale_id, slug, title, description) VALUES ($1, $2, $3, $4, $5)',
  //     [page.id, localeId, attrs.slug, attrs.title, attrs.description]
  //   );
  // }

  // Example: map shows
  // for (const show of shows) {
  //   const attrs = show.attributes;
  //   const localeId = localeMap[attrs.locale];
  //   const pictureUrl = attrs.picture?.data?.attributes?.url || null;
  //   const fullWidthUrl = attrs.pictureFullWidth?.data?.attributes?.url || null;
  //   await db.query(
  //     'INSERT INTO shows (strapi_id, locale_id, slug, title, description, keyword, teaser_sentence, active_show, url, start_time, end_time, frequency, day, instagram, soundcloud, mail, picture_path, picture_full_width_path) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)',
  //     [
  //       show.id,
  //       localeId,
  //       attrs.slug,
  //       attrs.title,
  //       attrs.description,
  //       attrs.keyword,
  //       attrs.teaserSentence,
  //       attrs.activeShow,
  //       attrs.url,
  //       attrs.startTime,
  //       attrs.endTime,
  //       attrs.frequency,
  //       attrs.day,
  //       attrs.instagram,
  //       attrs.soundcloud,
  //       attrs.mail,
  //       pictureUrl,
  //       fullWidthUrl,
  //     ]
  //   );
  // }

  // Example: map tags and synonyms from tag-list.json
  // const tagList = readJson('tag-list.json').data;
  // const tags = tagList?.attributes?.tag || [];
  // for (const tag of tags) {
  //   const { name, synonyms } = tag;
  //   // insert into tags, get tag_id
  //   // insert each synonym into tag_synonyms
  // }

  // Example: map single pages to single_pages table
  // const homepage = readJson('homepage.json').data;
  // const about = readJson('about.json').data;
  // // Insert page-like title/description plus full attributes JSON into content column

  console.log(
    'Template import script loaded. Implement DB writes where indicated by TODO comments.'
  );
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});

