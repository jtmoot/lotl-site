// Integration tests for the tee-sheet email ingest, over HTTP against
// `wrangler dev`: raw fixtures are delivered through wrangler's local Email
// Routing endpoint and the result is observed via GET /api/tee-sheet.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startWorker, stopWorker, BASE } from './harness.ts';

before(async () => { await startWorker(); });
after(async () => { await stopWorker(); });

// The fixtures all book "Thu 1 Oct" (received 24 Sep 2026), so query that day
// explicitly rather than depending on today's rolling window.
const DAY = '2026-10-01';
const SLOT = `${DAY} 10:00|other:test`;

function deliver(raw: Buffer | string) {
  return fetch(`${BASE}/cdn-cgi/handler/email?from=mail@bookwhen.com&to=tee@sync.ladiesonthelinksgolf.com`, {
    method: 'POST',
    headers: { 'content-type': 'message/rfc822' },
    body: typeof raw === 'string' ? raw : new Uint8Array(raw),
  });
}

async function sheet(query = `from=${DAY}&to=${DAY}`) {
  const res = await fetch(`${BASE}/api/tee-sheet?${query}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  return (await res.json()) as any;
}

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`);

test('an empty database yields an empty sheet with a truthful health line', async () => {
  const data = await sheet();
  assert.deepEqual(data.slots, []);
  assert.equal(data.health.lastEmailAt, null);
  assert.equal(data.health.emailsProcessed, 0);
  assert.equal(data.health.unparsedCount, 0);
});

test('a booking email puts the attendee on the sheet', async () => {
  const res = await deliver(fixture('booking-hw4r2.eml'));
  assert.ok(res.ok, `local email endpoint returned ${res.status}`);

  const data = await sheet();
  assert.equal(data.slots.length, 1);
  assert.equal(data.slots[0].slotKey, SLOT);
  assert.deepEqual(data.slots[0].players, ['jimmy horn']);
  assert.equal(data.health.emailsProcessed, 1);
  assert.equal(data.health.lastEmailAt, '2026-09-24T17:57:29.000Z');
});

test('redelivering the same Message-ID is a no-op', async () => {
  await deliver(fixture('booking-hw4r2.eml'));
  const data = await sheet();
  assert.deepEqual(data.slots[0].players, ['jimmy horn']);
  assert.equal(data.health.emailsProcessed, 1);
});

test('a two-attendee booking adds both names to the same slot', async () => {
  await deliver(fixture('booking-ckktt-two-attendees.eml'));
  const data = await sheet();
  assert.equal(data.slots.length, 1);
  // Booking order, then alphabetical within one email (both seats share a timestamp).
  assert.deepEqual(data.slots[0].players, ['jimmy horn', 'hi john', 'john marsh']);
});

test('a cancellation email moves that seat, and only that seat, to cancelled', async () => {
  await deliver(fixture('cancel-hw4r2.eml'));
  const data = await sheet();
  assert.deepEqual(data.slots[0].players, ['hi john', 'john marsh']);
  assert.deepEqual(data.slots[0].cancelled, ['jimmy horn']);
  assert.equal(data.health.emailsProcessed, 3);
});

test('an unrecognized subject is logged as unparsed and shows on the health line', async () => {
  const raw = fixture('booking-hw4r2.eml')
    .toString('latin1')
    .replace('Subject: [Bookwhen] New booking. Ref: HW4R2 - Test - jimmy horn', 'Subject: [Bookwhen] Booking amended. Ref: HW4R2')
    .replace('<6ab564889f757_7db0822402a@bgjobs-deployment-855898886d-d9t6l.mail>', '<amended-1@test.local>');
  const res = await deliver(Buffer.from(raw, 'latin1'));
  assert.ok(res.ok);

  const data = await sheet();
  assert.equal(data.health.unparsedCount, 1);
  assert.equal(data.health.unparsedLatestSubject, '[Bookwhen] Booking amended. Ref: HW4R2');
  // Nothing from it leaked onto the sheet.
  assert.equal(data.slots.length, 1);
  assert.equal(data.health.emailsProcessed, 3);
});

test('the API never returns an email address', async () => {
  const res = await fetch(`${BASE}/api/tee-sheet?from=${DAY}&to=${DAY}`);
  assert.doesNotMatch(await res.text(), /@/);
});

test('the rolling default window is today forward and the past preset is behind it', async () => {
  const upcoming = await sheet('');
  const today = new Date().toISOString().slice(0, 10);
  // League time is UTC-4/-5, so the league "today" is today or yesterday in UTC.
  assert.ok(upcoming.range.from <= today, `${upcoming.range.from} <= ${today}`);
  assert.ok(upcoming.range.to > upcoming.range.from);
  assert.equal(upcoming.preset, 'upcoming');

  const past = await sheet('range=past');
  assert.equal(past.preset, 'past');
  assert.ok(past.range.to < upcoming.range.from);
});
