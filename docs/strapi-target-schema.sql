-- Proposed PostgreSQL schema for migrated Strapi content
--
-- This is a starting point for the new VPS-hosted database.
-- It mirrors the Strapi structures actually used by the frontend and
-- leaves room for future evolution.

-- Locales, for multi-language support
CREATE TABLE locales (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE -- e.g. 'en', 'de'
);

-- Generic pages (news, shows, info, imprint, privacy, etc.)
CREATE TABLE pages (
  id SERIAL PRIMARY KEY,
  strapi_id INTEGER, -- optional reference to legacy Strapi ID
  locale_id INTEGER NOT NULL REFERENCES locales(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (locale_id, slug)
);

-- News items used on /news and per-article pages
CREATE TABLE news_items (
  id SERIAL PRIMARY KEY,
  strapi_id INTEGER,
  locale_id INTEGER NOT NULL REFERENCES locales(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT, -- from Strapi `text` field
  date TIMESTAMPTZ,
  picture_path TEXT, -- local or remote URL for main picture
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (locale_id, slug)
);

-- Shows (radio programmes)
CREATE TABLE shows (
  id SERIAL PRIMARY KEY,
  strapi_id INTEGER,
  locale_id INTEGER NOT NULL REFERENCES locales(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  keyword TEXT,
  teaser_sentence TEXT,
  active_show BOOLEAN DEFAULT TRUE,
  url TEXT,
  start_time TEXT, -- keeping schedule fields as strings for now (e.g. '20:00')
  end_time TEXT,
  frequency TEXT, -- e.g. 'weekly'
  day TEXT,       -- e.g. 'monday'
  instagram TEXT,
  soundcloud TEXT,
  mail TEXT,
  picture_path TEXT,           -- from picture.data.attributes.url
  picture_full_width_path TEXT, -- from pictureFullWidth.data.attributes.url
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (locale_id, slug)
);

-- Tags and synonyms
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE tag_synonyms (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- Many-to-many relationships for tags
CREATE TABLE news_item_tags (
  news_item_id INTEGER NOT NULL REFERENCES news_items(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (news_item_id, tag_id)
);

CREATE TABLE show_tags (
  show_id INTEGER NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (show_id, tag_id)
);

-- Single-type pages like homepage, about, info, imprint, privacy
-- Option A: one generic table with JSON content
CREATE TABLE single_pages (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL, -- e.g. 'homepage', 'about', 'info', 'imprint', 'privacy'
  locale_id INTEGER NOT NULL REFERENCES locales(id),
  title TEXT,        -- optional, can mirror PageComponent.title where relevant
  description TEXT,  -- optional
  content JSONB NOT NULL, -- full structured data (sections, hero, galleries, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (key, locale_id)
);

-- Media table (optional)
-- Used if you want a central registry of all media, with paths and metadata.
CREATE TABLE media_assets (
  id SERIAL PRIMARY KEY,
  strapi_id INTEGER,
  original_url TEXT,
  local_path TEXT, -- path on VPS or object store key
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

