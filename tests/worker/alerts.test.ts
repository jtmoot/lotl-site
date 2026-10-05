// Sync alerts: pure planning plus the notify loop against fake channels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectProblems, planAlerts, runAlerts, issueBody, type AlertState } from '../../worker/teesheet/alerts.ts';
import type { TeeSheet, Health, SlotRow } from '../../worker/teesheet/query.ts';

const NOW = new Date('2026-10-04T18:00:00Z');
const at = (min: number) => new Date(NOW.getTime() + min * 60000);

const health = (over: Partial<Health> = {}): Health => ({
  lastEmailAt: null,
  emailsProcessed: 0,
  emailLastError: null,
  emailLastErrorAt: null,
  apiLastOkAt: NOW.toISOString(),
  apiLastError: null,
  apiLastErrorAt: null,
  unparsedCount: 0,
  unparsedLatestSubject: null,
  unparsedLatestAt: null,
  orphanSeatsHidden: 0,
  countMismatchSlots: 0,
  ...over,
});
const slot = (over: Partial<SlotRow> = {}): SlotRow => ({
  slotKey: '2026-10-27 12:00|other:boos & birdies',
  date: '2026-10-27',
  time: '12:00',
  title: 'Boos & Birdies',
  kind: 'other',
  attendeeCount: 8,
  attendeeLimit: 60,
  eventCancelled: false,
  players: [],
  cancelled: [],
  countMismatch: true,
  ...over,
});
const sheet = (h: Partial<Health> = {}, slots: SlotRow[] = []): TeeSheet => ({
  range: { from: '2026-10-04', to: '2026-12-03' },
  generatedAt: NOW.toISOString(),
  slots,
  health: health(h),
});

/** Just enough D1 for runAlerts: one sync_state row. */
function fakeDb(initial?: AlertState) {
  let value: string | null = initial ? JSON.stringify(initial) : null;
  return {
    get state(): AlertState {
      return value ? JSON.parse(value) : {};
    },
    prepare(sql: string) {
      return {
        bind: (...args: unknown[]) => ({
          first: async () => (value ? { value } : null),
          run: async () => {
            if (sql.startsWith('INSERT')) value = String(args[1]);
          },
        }),
      };
    },
  };
}

function fakeChannels() {
  const calls: { url: string; method: string; body: any }[] = [];
  const fetchFn = (async (url: string, init: any) => {
    calls.push({ url, method: init.method, body: JSON.parse(init.body) });
    const body = url.endsWith('/issues') ? { number: 7, html_url: 'https://github.com/o/r/issues/7' } : {};
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { calls, fetchFn };
}
const cfg = (fetchFn: typeof fetch) => ({
  resendKey: 'rk',
  alertEmail: 'owner@example.com',
  githubToken: 'gh',
  repo: 'o/r',
  fetch: fetchFn,
});

test('a healthy sheet has no problems', () => {
  assert.deepEqual(detectProblems(sheet(), NOW), []);
});

test('each health condition becomes a problem; old unreadable emails do not nag', () => {
  const keys = (s: TeeSheet) => detectProblems(s, NOW).map((p) => p.key);
  assert.deepEqual(keys(sheet({ apiLastError: 'HTTP 500' })), ['api-failing']);
  assert.deepEqual(keys(sheet({ apiLastOkAt: null })), ['api-never']);
  assert.deepEqual(keys(sheet({ apiLastOkAt: at(-60).toISOString() })), ['api-stuck']);
  // Names hidden because their event left Bookwhen are expected, not a problem.
  assert.deepEqual(keys(sheet({ orphanSeatsHidden: 8 })), []);
  assert.deepEqual(keys(sheet({}, [slot(), slot({ slotKey: 'x', countMismatch: false })])), [
    'mismatch:2026-10-27 12:00|other:boos & birdies',
  ]);
  const recent = at(-30).toISOString();
  assert.deepEqual(keys(sheet({ unparsedCount: 1, unparsedLatestAt: recent })), [`unparsed:${recent}`]);
  assert.deepEqual(keys(sheet({ unparsedCount: 1, unparsedLatestAt: at(-3 * 24 * 60).toISOString() })), []);
});

test('the public summary never carries the email subject; it stays in the private detail', () => {
  const [p] = detectProblems(
    sheet({ unparsedCount: 1, unparsedLatestAt: at(-5).toISOString(), unparsedLatestSubject: 'Ref: AB12 - Pat Example' }),
    NOW
  );
  assert.doesNotMatch(p.summary, /Pat Example/);
  assert.match(p.privateDetail ?? '', /Pat Example/);
  assert.doesNotMatch(issueBody([p]), /Pat Example/);
  assert.match(issueBody([p]), /^@claude /);
});

test('a problem is announced only once it survives to the next run, then reminded daily, then resolved', () => {
  const problems = detectProblems(sheet({ apiLastError: 'HTTP 500' }), NOW);
  const first = planAlerts({}, problems, NOW);
  assert.equal(first.fresh.length, 0, 'first sighting waits');

  const second = planAlerts(first.state, problems, at(15));
  assert.deepEqual(second.fresh.map((p) => p.key), ['api-failing']);
  second.state['api-failing'].notifiedAt = at(15).toISOString();

  const third = planAlerts(second.state, problems, at(30));
  assert.equal(third.fresh.length + third.reminders.length, 0, 'no repeat on the next run');

  const nextDay = planAlerts(third.state, problems, at(15 + 24 * 60));
  assert.deepEqual(nextDay.reminders.map((p) => p.key), ['api-failing']);

  const cleared = planAlerts(third.state, [], at(45));
  assert.deepEqual(cleared.resolved.map((r) => r.key), ['api-failing']);
  assert.deepEqual(cleared.state, {});
});

test('a blip that clears before it was announced is dropped silently', () => {
  const first = planAlerts({}, detectProblems(sheet({ apiLastError: 'HTTP 500' }), NOW), NOW);
  const next = planAlerts(first.state, [], at(15));
  assert.deepEqual(next.resolved, []);
});

test('runAlerts opens one issue and sends one email for a confirmed problem, then closes the issue when it clears', async () => {
  const db = fakeDb();
  const { calls, fetchFn } = fakeChannels();
  const bad = sheet({ countMismatchSlots: 1 }, [slot()]);

  await runAlerts(db as never, bad, cfg(fetchFn), NOW);
  assert.equal(calls.length, 0, 'first sighting is quiet');

  await runAlerts(db as never, bad, cfg(fetchFn), at(15));
  assert.deepEqual(calls.map((c) => c.url), ['https://api.github.com/repos/o/r/issues', 'https://api.resend.com/emails']);
  assert.match(calls[0].body.body, /@claude/);
  assert.match(calls[0].body.body, /Bookwhen reports 8 booked, the tee sheet lists 0 names/);
  assert.deepEqual(calls[1].body.to, ['owner@example.com']);
  assert.match(calls[1].body.html, /issues\/7/);
  assert.equal(db.state['mismatch:2026-10-27 12:00|other:boos & birdies'].issue, 7);

  await runAlerts(db as never, bad, cfg(fetchFn), at(30));
  assert.equal(calls.length, 2, 'no repeat while it persists');

  await runAlerts(db as never, sheet(), cfg(fetchFn), at(45));
  assert.deepEqual(calls.slice(2).map((c) => `${c.method} ${c.url}`), [
    'POST https://api.resend.com/emails',
    'POST https://api.github.com/repos/o/r/issues/7/comments',
    'PATCH https://api.github.com/repos/o/r/issues/7',
  ]);
  assert.deepEqual(db.state, {});
});

test('with no secrets set nothing is sent, and a failing channel never throws', async () => {
  const db = fakeDb();
  const { calls, fetchFn } = fakeChannels();
  const bad = sheet({ apiLastError: 'HTTP 500' });
  await runAlerts(db as never, bad, { fetch: fetchFn }, NOW);
  await runAlerts(db as never, bad, { fetch: fetchFn }, at(15));
  assert.equal(calls.length, 0);

  const broken = (async () => new Response('no', { status: 500 })) as unknown as typeof fetch;
  const plan = await runAlerts(db as never, bad, cfg(broken), at(30));
  assert.ok(plan);
  assert.equal(db.state['api-failing'].notifiedAt, undefined, 'undelivered alerts are retried next run');
});

test('when the issue opens but the email fails, the email alone is retried until it sends', async () => {
  const db = fakeDb();
  const calls: string[] = [];
  let emailWorks = false;
  const fetchFn = (async (url: string) => {
    calls.push(url);
    if (url.includes('resend.com')) return new Response(emailWorks ? '{}' : 'rate limited', { status: emailWorks ? 200 : 429 });
    return new Response(JSON.stringify({ number: 9, html_url: 'https://github.com/o/r/issues/9' }), { status: 200 });
  }) as unknown as typeof fetch;
  const bad = sheet({ apiLastError: 'HTTP 500' });

  await runAlerts(db as never, bad, cfg(fetchFn), NOW);
  await runAlerts(db as never, bad, cfg(fetchFn), at(15));
  assert.equal(db.state['api-failing'].issue, 9);
  assert.equal(db.state['api-failing'].emailPending, true);

  await runAlerts(db as never, bad, cfg(fetchFn), at(30));
  assert.equal(calls.filter((u) => u.endsWith('/issues')).length, 1, 'the issue is not opened twice');
  assert.equal(db.state['api-failing'].emailPending, true, 'still failing, still pending');

  emailWorks = true;
  await runAlerts(db as never, bad, cfg(fetchFn), at(45));
  assert.equal(db.state['api-failing'].emailPending, undefined);
  const before = calls.length;
  await runAlerts(db as never, bad, cfg(fetchFn), at(60));
  assert.equal(calls.length, before, 'once sent, nothing more until the daily reminder');
});
