-- Learning Journey / SchoolsPH Cloudflare D1 Schema v1
-- Run this in Cloudflare D1 Console for database: learningjourney-db

DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  username TEXT PRIMARY KEY,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  author TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  image_url TEXT,
  image_key TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  deleted INTEGER NOT NULL DEFAULT 0,
  deleted_by TEXT,
  deleted_at TEXT,
  last_edited_by TEXT,
  last_edited_at TEXT
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  username TEXT,
  action TEXT NOT NULL,
  details TEXT,
  post_id TEXT
);

CREATE INDEX idx_posts_status_deleted_created ON posts(status, deleted, created_at DESC);
CREATE INDEX idx_audit_date ON audit_log(date DESC);

INSERT INTO users (username, password_salt, password_hash, role, name, active)
VALUES
('admin', 'lj-admin-default-salt-2026', 'fabba11e14a316e6faf14cf0b441c4e002d897a4fc6ba78e13f0752237e27128', 'admin', 'School Admin', 1),
('teacher', 'lj-teacher-default-salt-2026', '6fc06dda5a6d33c6ecb21b5b77e1f5c2b4b65ed9272d75af4f1eb3cd42b20cf9', 'teacher', 'Teacher Account', 1);

INSERT INTO settings (key, value, description)
VALUES
('school_name', 'Learning Journey Child Growth Center, Inc.', 'Official school name'),
('school_tagline', 'Where Learning is a Journey and Not a Race', 'School tagline'),
('phone', '(02) 8285 4646', 'School phone number'),
('email', 'ljcgc.malabon@gmail.com', 'School email address'),
('messenger', 'https://www.facebook.com/messages/t/107674705934358', 'Messenger link'),
('google_maps', 'https://maps.app.goo.gl/dGGMgYLCMbbz9JUC6', 'Google Maps link'),
('address', '23 Comercio St. Tugatog, Malabon, Philippines, 1470', 'School address'),
('office_hours', 'Monday - Friday, 7:00 AM - 5:00 PM', 'Office hours'),
('logo_url', '', 'School logo URL');
