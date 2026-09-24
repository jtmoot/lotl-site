// Pure helpers of the Bookwhen client: URL shape, auth, and the event -> row
// mapping whose slot_key must line up with what the email parser produces.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEventsUrl, authHeader, leagueStamp, mapEvent } from '../../worker/teesheet/bookwhen.ts';
import { makeSlotKey } from '../../worker/teesheet/parse.ts';

test('events URL uses yyyymmdd filters and an offset', () => {
  assert.equal(
    buildEventsUrl('https://api.bookwhen.com/v2/', '2026-09-24', '2026-11-23', 40),
    'https://api.bookwhen.com/v2/events?filter%5Bfrom%5D=20260924&filter%5Bto%5D=20261123&page%5Boffset%5D=40'
  );
});

test('auth is HTTP Basic with the token as username and an empty password', () => {
  assert.equal(authHeader('abc'), 'Basic ' + Buffer.from('abc:').toString('base64'));
});

test('league stamp converts UTC instants to Eastern wall time, DST-aware', () => {
  assert.equal(leagueStamp(new Date('2026-10-01T14:00:00Z')), '2026-10-01 10:00'); // EDT
  assert.equal(leagueStamp(new Date('2026-12-07T20:30:00Z')), '2026-12-07 15:30'); // EST
  assert.equal(leagueStamp(new Date('2026-06-02T03:20:00Z')), '2026-06-01 23:20'); // crosses midnight
});

test('an API event maps to a row whose slot_key equals the email-side key', () => {
  const row = mapEvent({
    id: 'ev1',
    attributes: {
      title: 'Tee Time ⛳',
      start_at: '2026-10-05T19:40:00Z',
      end_at: '2026-10-05T21:40:00Z',
      attendee_count: 3,
      attendee_limit: 4,
      cancelled_at: null,
      tags: [],
    },
  });
  assert.ok(row);
  assert.equal(row.slot_key, makeSlotKey('2026-10-05', 15, 40, 'Tee Time ⛳'));
  assert.equal(row.kind, 'tee_time');
  assert.equal(row.attendee_count, 3);
  assert.equal(row.attendee_limit, 4);
  assert.equal(row.start_at, '2026-10-05T19:40:00.000Z');
});

test('private events key on their full title; missing limit stays null; junk is skipped', () => {
  const row = mapEvent({
    id: 'ev2',
    attributes: { title: 'Copy of: Sisters Twosome — 3:20 PM (Private) Ali & Robin ', start_at: '2026-10-05T19:20:00Z', attendee_limit: null },
  });
  assert.ok(row);
  assert.equal(row.slot_key, '2026-10-05 15:20|other:sisters twosome — 3:20 pm (private) ali & robin');
  assert.equal(row.kind, 'other');
  assert.equal(row.attendee_limit, null);
  assert.equal(row.attendee_count, 0);

  assert.equal(mapEvent({ id: 'x', attributes: { title: 'No start' } }), null);
  assert.equal(mapEvent({ id: '', attributes: { title: 'No id', start_at: '2026-10-05T19:20:00Z' } }), null);
});
