// Migration smoke test: applies every migration to a throwaway local D1 and
// checks the tee-sheet tables exist with the constraints the Worker relies on.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const STATE = '.wrangler/schema-test-state';

function d1(sql: string): Array<Record<string, unknown>> {
  const out = execSync(
    `npx wrangler d1 execute lotl-comments --local --persist-to ${STATE} --json --command ${JSON.stringify(sql)}`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  const parsed = JSON.parse(out) as Array<{ results: Array<Record<string, unknown>> }>;
  return parsed[0]?.results ?? [];
}

before(() => {
  execSync(`rm -rf ${STATE}`, { stdio: 'ignore' });
  execSync(`npx wrangler d1 migrations apply lotl-comments --local --persist-to ${STATE}`, {
    stdio: 'ignore',
  });
});

test('all tee-sheet tables exist alongside the story-notes tables', () => {
  const rows = d1("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  const names = rows.map((r) => r.name);
  for (const t of ['bookings', 'comments', 'events', 'likes', 'processed_messages', 'sync_state', 'unparsed']) {
    assert.ok(names.includes(t), `missing table ${t}`);
  }
});

test('bookings upsert on (slot_key, name_key) flips status instead of duplicating', () => {
  d1(
    "INSERT INTO bookings (slot_key, name_key, name, ref, status, source) VALUES ('2026-10-01 10:00|tee_time', 'jane doe', 'Jane Doe', 'ABCDE', 'booked', 'email')"
  );
  d1(
    "INSERT INTO bookings (slot_key, name_key, name, ref, status, source) VALUES ('2026-10-01 10:00|tee_time', 'jane doe', 'Jane Doe', 'ABCDE', 'cancelled', 'email') ON CONFLICT(slot_key, name_key) DO UPDATE SET status = excluded.status"
  );
  const rows = d1("SELECT status FROM bookings WHERE slot_key = '2026-10-01 10:00|tee_time'");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'cancelled');
});

test('bookings rejects unknown status and source values', () => {
  assert.throws(() =>
    d1("INSERT INTO bookings (slot_key, name_key, name, status, source) VALUES ('s', 'n', 'N', 'maybe', 'email')")
  );
  assert.throws(() =>
    d1("INSERT INTO bookings (slot_key, name_key, name, status, source) VALUES ('s', 'n', 'N', 'booked', 'fax')")
  );
});

test('processed_messages dedupes on message_id', () => {
  d1("INSERT INTO processed_messages (message_id, subject, received_at, action) VALUES ('<a@b>', 's', '2026-09-24T00:00:00Z', 'booked')");
  assert.throws(() =>
    d1("INSERT INTO processed_messages (message_id, subject, received_at, action) VALUES ('<a@b>', 's', '2026-09-24T00:00:00Z', 'booked')")
  );
});
