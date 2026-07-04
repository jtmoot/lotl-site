-- Story notes ("comments") and hearts ("likes").
-- Emails are Reply-To fodder for Stacey, never rendered publicly.
-- ip_hash is a salted SHA-256 used only for rate limiting.
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip_hash TEXT NOT NULL
);
CREATE INDEX idx_comments_slug ON comments (slug, created_at);
CREATE INDEX idx_comments_ip ON comments (ip_hash, created_at);

CREATE TABLE likes (
  slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
