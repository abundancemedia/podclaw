-- PodClaw Phase 1 Schema
-- Run against Neon Postgres

CREATE TABLE IF NOT EXISTS shows (
  id TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  author TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  explicit BOOLEAN DEFAULT false,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  show_id TEXT NOT NULL REFERENCES shows(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  audio_length INTEGER,
  audio_type TEXT DEFAULT 'audio/mpeg',
  duration INTEGER,
  explicit BOOLEAN DEFAULT false,
  episode_type TEXT DEFAULT 'full',
  season INTEGER,
  episode_number INTEGER,
  pub_date TIMESTAMPTZ DEFAULT now(),
  guid TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  show_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_episodes_show ON episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_show ON api_keys(show_id);
