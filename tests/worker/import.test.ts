// Backfill importer: synthetic CSV (fake names) -> SQL -> local D1.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parseCsv, buildImport, parseBookwhenTime } from '../../scripts/import-attendances.mjs';

const STATE = '.wrangler/import-test-state';
const SQL_PATH = `${STATE}/import.sql`;

function d1(sql: string): Array<Record<string, unknown>> {
  const out = execSync(
    `npx wrangler d1 execute lotl-comments --local --persist-to ${STATE} --json --command ${JSON.stringify(sql)}`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  return (JSON.parse(out) as Array<{ results: Array<Record<string, unknown>> }>)[0]?.results ?? [];
}

const records = parseCsv(readFileSync('tests/fixtures/attendances-sample.csv', 'utf8'));
const built = buildImport(records, new Date('2026-09-24T20:00:00Z'));

test('CSV parsing handles quoted commas and yields one record per row', () => {
  assert.equal(records.length, 5);
  assert.equal(records[0]['Location'], 'North Hill Country Club, 29 Merry Ave #4415, Duxbury MA 02332-4415');
});

test('Bookwhen timestamps with numeric offsets parse to the right instant', () => {
  assert.equal(parseBookwhenTime('2026-06-01 15:20:00 -0400')?.toISOString(), '2026-06-01T19:20:00.000Z');
  assert.equal(parseBookwhenTime('garbage'), null);
});

test('generated SQL carries names and slot keys but never an email or phone', () => {
  assert.doesNotMatch(built.sql, /@/);
  assert.doesNotMatch(built.sql, /555-010/);
  assert.match(built.sql, /'2026-06-01 15:20\|tee_time'/);
  assert.match(built.sql, /'Ann Sample'/);
  // Full name preferred over the "(me)" customer display name.
  assert.doesNotMatch(built.sql, /Ann \(me\)/);
  // Missing Full name falls back to the attendee customer name.
  assert.match(built.sql, /'Cat Demo'/);
  assert.equal(built.events, 3);
  assert.equal(built.bookings, 5);
  assert.deepEqual(built.skipped, []);
});

test('applying the SQL to a fresh local D1 yields the expected sheet rows', () => {
  execSync(`rm -rf ${STATE}`, { stdio: 'ignore' });
  execSync(`npx wrangler d1 migrations apply lotl-comments --local --persist-to ${STATE}`, { stdio: 'ignore' });
  // Pretend a live email already placed Ann in the slot; the import must not overwrite it.
  d1("INSERT INTO bookings (slot_key, name_key, name, ref, status, source) VALUES ('2026-06-01 15:20|tee_time', 'ann sample', 'Ann Sample', 'LIVE1', 'booked', 'email')");
  writeFileSync(SQL_PATH, built.sql);
  execSync(`npx wrangler d1 execute lotl-comments --local --persist-to ${STATE} --file ${SQL_PATH}`, { stdio: 'ignore' });

  const events = d1('SELECT id, kind, attendee_count FROM events ORDER BY id');
  assert.deepEqual(events, [
    { id: 'ev-lesson-1', kind: 'lesson', attendee_count: 1 },
    { id: 'ev-priv-1', kind: 'other', attendee_count: 1 },
    { id: 'ev-tee-1', kind: 'tee_time', attendee_count: 2 },
  ]);

  const tee = d1("SELECT name, status, source, ref FROM bookings WHERE slot_key = '2026-06-01 15:20|tee_time' ORDER BY name");
  assert.deepEqual(tee, [
    { name: 'Ann Sample', status: 'booked', source: 'email', ref: 'LIVE1' },
    { name: 'Bea Example', status: 'cancelled', source: 'import', ref: 'FGHIJ' },
    { name: 'Cat Demo', status: 'booked', source: 'import', ref: 'KLMNO' },
  ]);

  const priv = d1("SELECT slot_key FROM bookings WHERE name = 'Player E'");
  assert.equal(priv[0].slot_key, '2026-06-01 15:30|other:standing twosome - player e & player f');
});
