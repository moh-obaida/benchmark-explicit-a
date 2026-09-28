import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { ensureSeed } from "./seed";

const globalForDb = globalThis as unknown as { yaraDb?: DatabaseSync };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK(role IN ('visitor','admin')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS authors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  image_id TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_id TEXT,
  icon TEXT NOT NULL DEFAULT '',
  color_token TEXT NOT NULL DEFAULT 'brand',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  show_on_home INTEGER NOT NULL DEFAULT 1,
  show_in_nav INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  author_id TEXT,
  cover_id TEXT,
  primary_category_id TEXT,
  age_min INTEGER,
  age_max INTEGER,
  story_type TEXT,
  genre TEXT,
  reading_minutes INTEGER,
  featured INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  publish_at TEXT,
  popularity INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  narrator TEXT,
  series_name TEXT,
  episode_number INTEGER,
  external_source TEXT,
  audio_url TEXT,
  video_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  origin TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS story_categories (
  story_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  PRIMARY KEY (story_id, category_id)
);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS story_tags (
  story_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (story_id, tag_id)
);
CREATE TABLE IF NOT EXISTS story_relations (
  story_id TEXT NOT NULL,
  related_id TEXT NOT NULL,
  PRIMARY KEY (story_id, related_id)
);
CREATE TABLE IF NOT EXISTS story_images (
  story_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (story_id, media_id)
);
CREATE TABLE IF NOT EXISTS homepage_sections (
  id TEXT PRIMARY KEY,
  section_type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'auto',
  source TEXT,
  category_id TEXT,
  item_limit INTEGER NOT NULL DEFAULT 4,
  layout TEXT NOT NULL DEFAULT 'rail',
  accent_token TEXT,
  body TEXT,
  image_id TEXT,
  link_href TEXT,
  link_label TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS section_stories (
  section_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  excluded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (section_id, story_id)
);
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, story_id)
);
CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anon_id TEXT,
  story_id TEXT,
  category_id TEXT,
  event TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stories_pub ON stories(published, publish_at);
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories(author_id);
CREATE INDEX IF NOT EXISTS idx_activity_story ON activity(story_id, created_at);
`;

export function dataDir() {
  return path.join(process.cwd(), "data");
}

export function mediaDir() {
  const dir = path.join(dataDir(), "media");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.yaraDb) {
    fs.mkdirSync(dataDir(), { recursive: true });
    const db = new DatabaseSync(path.join(dataDir(), "yara3.db"));
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA busy_timeout = 3000");
    db.exec(SCHEMA);
    globalForDb.yaraDb = db;
    ensureSeed(db);
  }
  return globalForDb.yaraDb;
}
