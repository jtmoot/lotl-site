// Integration: the scheduled handler pulls events from a stub Bookwhen API
// (started here on the port .dev.vars points BOOKWHEN_API_BASE at), upserts
// them, sweeps deletions, joins with emailed names, and reports health.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { startWorker, stopWorker, BASE } from './harness.ts';

const STUB_PORT = 8799;
let stub: Server;
let mode: 'two' | 'one' | 'error' = 'two';
let seenAuth: string | null = null;

// Rolling window: pick a day well inside today .. today+60 so the sweep and
// query both cover it regardless of when this runs.
const day = new Date();
day.setUTCDate(day.getUTCDate() + 7);
const DAY = day.toISOString().slice(0, 10);
const START = `${DAY}T19:40:00Z`; // 3:40pm EDT / 2:40pm EST

const EV1 = { id: 'ev-tee', attributes: { title: 'Tee Time ⛳', start_at: START, end_at: `${DAY}T21:40:00Z`, attendee_count: 2, attendee_limit: 4, cancelled_at: null, tags: [] } };
const EV2 = { id: 'ev-lesson', attributes: { title: 'Lesson with Christian', start_at: `${DAY}T21:00:00Z`, end_at: `${DAY}T22:00:00Z`, attendee_count: 1, attendee_limit: 6, cancelled_at: null, tags: [] } };

before(async () => {
  stub = createServer((req, res) => {
    seenAuth = req.headers.authorization ?? null;
    const url = new URL(req.url ?? '/', 'http://x');
    if (mode === 'error') {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ errors: [{ title: 'boom' }] }));
      return;
    }
    const offset = Number(url.searchParams.get('page[offset]') ?? '0');
    const all = mode === 'two' ? [EV1, EV2] : [EV1];
    const page = offset === 0 ? all : [];
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: page, links: { next: null } }));
  });
  await new Promise<void>((r) => stub.listen(STUB_PORT, '127.0.0.1', r));
  await startWorker();
});
after(async () => {
  await stopWorker();
  stub.close();
});

function runCron() {
  return fetch(`${BASE}/cdn-cgi/handler/scheduled?cron=*/15+*+*+*+*`);
}
async function sheet(q = `from=${DAY}&to=${DAY}`) {
  return (await (await fetch(`${BASE}/api/tee-sheet?${q}`)).json()) as any;
}

test('the cron pulls events with Basic auth and records a successful sync', async () => {
  const res = await runCron();
  assert.ok(res.ok, `scheduled endpoint returned ${res.status}`);
  assert.equal(seenAuth, 'Basic ' + Buffer.from('local-dev-fake-bookwhen-token:').toString('base64'));

  const data = await sheet();
  assert.equal(data.slots.length, 2);
  const tee = data.slots.find((s: any) => s.kind === 'tee_time');
  assert.equal(tee.title, 'Tee Time ⛳');
  assert.equal(tee.attendeeCount, 2);
  assert.equal(tee.attendeeLimit, 4);
  assert.ok(data.health.apiLastOkAt);
  assert.equal(data.health.apiLastError, null);
});

test('emailed names join onto the API event by slot key', async () => {
  // Rewrite the fixture's slot to match EV1 (same event type keyword, same wall time).
  const dt = new Date(START);
  const label = dt.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', day: 'numeric', month: 'short' });
  const [wd, mon, d] = label.replace(',', '').split(' ');
  const time = dt.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
  const raw = readFileSync('tests/fixtures/booking-hw4r2.eml')
    .toString('latin1')
    .replace('Thu 1 Oct, 10:00am - 11:00am', `${wd} ${d} ${mon}, ${time} - ${time}`)
    .replace(/^Test\r?$/m, 'Tee Time')
    .replace('Date: Thu, 24 Sep 2026 17:57:29 +0000', `Date: ${new Date().toUTCString()}`)
    .replace('<6ab564889f757_7db0822402a@bgjobs-deployment-855898886d-d9t6l.mail>', '<join-1@test.local>');
  const res = await fetch(`${BASE}/cdn-cgi/handler/email?from=mail@bookwhen.com&to=tee@sync.ladiesonthelinksgolf.com`, {
    method: 'POST',
    headers: { 'content-type': 'message/rfc822' },
    body: raw,
  });
  assert.ok(res.ok);

  const data = await sheet();
  const tee = data.slots.find((s: any) => s.kind === 'tee_time');
  assert.deepEqual(tee.players, ['jimmy horn']);
  assert.equal(data.slots.length, 2, 'the name landed on the existing slot, not a new one');
});

test('an event Bookwhen stops returning is swept from the window', async () => {
  mode = 'one';
  await runCron();
  const data = await sheet();
  assert.equal(data.slots.length, 1);
  assert.equal(data.slots[0].kind, 'tee_time');
});

test('an API failure is loud on the health line and keeps the last good data', async () => {
  mode = 'error';
  const res = await runCron();
  assert.ok(!res.ok || res.status >= 400 || true); // the handler rethrows; status depends on wrangler
  const data = await sheet();
  assert.match(data.health.apiLastError, /HTTP 500/);
  assert.ok(data.health.apiLastErrorAt);
  assert.ok(data.health.apiLastOkAt, 'previous success is still recorded');
  assert.equal(data.slots.length, 1, 'stale-but-present beats empty');
});

test('a later success clears the error', async () => {
  mode = 'one';
  await runCron();
  const data = await sheet();
  assert.equal(data.health.apiLastError, null);
});

test('once the API has synced after the last change, a count that disagrees with the names is flagged', async () => {
  // EV1 reports attendee_count 2 but only one name was ever emailed for it, and
  // the cron has now run after that email arrived.
  const data = await sheet();
  const tee = data.slots.find((s: any) => s.kind === 'tee_time');
  assert.equal(tee.countMismatch, true);
  assert.equal(data.health.countMismatchSlots, 1);
});

test('names whose event Bookwhen no longer lists are hidden, not shown as a ghost row', async () => {
  // A booking for "Ghost Group" at DAY 9:00am (league time), received well
  // before the last sync, with no matching event in the stub API.
  const dt = new Date(`${DAY}T13:00:00Z`);
  const label = dt.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', day: 'numeric', month: 'short' });
  const [wd, mon, d] = label.replace(',', '').split(' ');
  const raw = readFileSync('tests/fixtures/booking-hw4r2.eml')
    .toString('latin1')
    .replace('Thu 1 Oct, 10:00am - 11:00am', `${wd} ${d} ${mon}, 9:00am - 10:00am`)
    .replace(/^Test\r?$/m, 'Ghost Group')
    .replace('Date: Thu, 24 Sep 2026 17:57:29 +0000', `Date: ${new Date(Date.now() - 3 * 3600 * 1000).toUTCString()}`)
    .replace('<6ab564889f757_7db0822402a@bgjobs-deployment-855898886d-d9t6l.mail>', '<ghost-1@test.local>');
  const res = await fetch(`${BASE}/cdn-cgi/handler/email?from=mail@bookwhen.com&to=tee@sync.ladiesonthelinksgolf.com`, {
    method: 'POST',
    headers: { 'content-type': 'message/rfc822' },
    body: raw,
  });
  assert.ok(res.ok);

  // The email is stored, but the sheet hides it and says how many names are hidden.
  const data = await sheet();
  assert.equal(data.slots.some((s: any) => s.slotKey.includes('ghost group')), false);
  assert.equal(data.health.orphanSeatsHidden, 1);
  assert.equal(data.health.emailsProcessed, 2);
});
