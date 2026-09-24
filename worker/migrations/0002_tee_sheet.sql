-- Tee sheet sync: events from the Bookwhen API, attendee names from Bookwhen
-- notification emails, plus bookkeeping for idempotency and health.
-- Names only. No email addresses or phone numbers are ever stored here.

-- Upcoming (and imported past) events straight from Bookwhen. slot_key is
-- "YYYY-MM-DD HH:MM|<slot type>" in league time and is how names attach.
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  slot_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  attendee_count INTEGER NOT NULL DEFAULT 0,
  attendee_limit INTEGER,
  cancelled_at TEXT,
  synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_events_start ON events (start_at);
CREATE INDEX idx_events_slot ON events (slot_key);

-- One row per seat: a person in a slot. Keyed on slot + normalized name, not
-- booking ref, because cancellation emails may carry no usable ref.
CREATE TABLE bookings (
  slot_key TEXT NOT NULL,
  name_key TEXT NOT NULL,
  name TEXT NOT NULL,
  ref TEXT,
  status TEXT NOT NULL CHECK (status IN ('booked', 'cancelled')),
  source TEXT NOT NULL CHECK (source IN ('email', 'import')),
  message_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (slot_key, name_key)
);
CREATE INDEX idx_bookings_slot ON bookings (slot_key, status);

-- Every email the handler has fully processed. Message-ID makes redelivery a no-op.
CREATE TABLE processed_messages (
  message_id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  received_at TEXT NOT NULL,
  action TEXT NOT NULL,
  ref TEXT
);
CREATE INDEX idx_processed_received ON processed_messages (received_at);

-- Anything the parser could not match. Surfaced on the health line, never dropped.
CREATE TABLE unparsed (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  subject TEXT NOT NULL,
  received_at TEXT NOT NULL,
  reason TEXT NOT NULL
);
CREATE INDEX idx_unparsed_received ON unparsed (received_at);

-- Small key/value store for health: api_last_ok_at, api_last_error,
-- api_last_error_at, email_last_error, email_last_error_at.
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
