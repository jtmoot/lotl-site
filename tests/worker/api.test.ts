// Integration tests for the story-notes API, over HTTP against wrangler dev.
// Uses the local dev secrets from .dev.vars (dummy Turnstile always-pass key,
// fake Resend key) — see harness.ts.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startWorker, stopWorker, BASE } from './harness.ts';

// A story that exists in the built site (dist/) — slug validity is checked
// against static assets.
const SLUG = 'welcome-to-stories';

before(async () => { await startWorker(); });
after(() => { stopWorker(); });

function postComment(slug: string, fields: Record<string, string>) {
  return fetch(`${BASE}/api/stories/${slug}/comments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ 'cf-turnstile-response': 'dummy-token', ...fields }),
  });
}

test('a fresh story has zero likes and no comments', async () => {
  const res = await fetch(`${BASE}/api/stories/${SLUG}`);
  assert.equal(res.status, 200);
  const data = await res.json() as any;
  assert.deepEqual(data, { likes: 0, comments: [] });
});

test('unknown or malformed slugs 404', async () => {
  assert.equal((await fetch(`${BASE}/api/stories/not-a-real-story`)).status, 404);
  assert.equal((await fetch(`${BASE}/api/stories/..%2Fadmin`)).status, 404);
});

test('liking a story increments its count', async () => {
  const res = await fetch(`${BASE}/api/stories/${SLUG}/like`, { method: 'POST' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json() as any, { likes: 1 });

  await fetch(`${BASE}/api/stories/${SLUG}/like`, { method: 'POST' });
  const data = await (await fetch(`${BASE}/api/stories/${SLUG}`)).json() as any;
  assert.equal(data.likes, 2);
});

test('liking an unknown story 404s and stores nothing', async () => {
  const res = await fetch(`${BASE}/api/stories/nope/like`, { method: 'POST' });
  assert.equal(res.status, 404);
});

// Uses a second real story so comment tests don't interfere with like tests.
const SLUG2 = 'member-spotlight-melissa';

test('posting a comment stores it and returns it in reading order — even though the (fake) email send fails', async () => {
  const first = await postComment(SLUG2, { name: 'Melissa', body: 'Love this!' });
  assert.equal(first.status, 201);

  const second = await postComment(SLUG2, {
    name: 'Stacey',
    email: 'stacey@example.com',
    body: 'So proud of you.',
  });
  assert.equal(second.status, 201);

  const data = await (await fetch(`${BASE}/api/stories/${SLUG2}`)).json() as any;
  assert.equal(data.comments.length, 2);
  assert.equal(data.comments[0].name, 'Melissa');
  assert.equal(data.comments[1].body, 'So proud of you.');
  // Public payload never exposes emails or ip hashes.
  for (const c of data.comments) {
    assert.deepEqual(Object.keys(c).sort(), ['body', 'created_at', 'id', 'name']);
  }
});

test('a honeypotted comment returns 200 but is never stored', async () => {
  const before = await (await fetch(`${BASE}/api/stories/${SLUG2}`)).json() as any;
  const res = await postComment(SLUG2, {
    name: 'Bot',
    body: 'casino time',
    website: 'https://spam.example',
  });
  assert.equal(res.status, 200); // the bot is told "success"
  const after = await (await fetch(`${BASE}/api/stories/${SLUG2}`)).json() as any;
  assert.equal(after.comments.length, before.comments.length);
});

test('a comment without a Turnstile token is rejected', async () => {
  const res = await fetch(`${BASE}/api/stories/${SLUG2}/comments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'No Token', body: 'hello' }),
  });
  assert.equal(res.status, 403);
});

test('a fourth comment inside a minute from one IP is rate-limited', async () => {
  // Two comments already posted from this IP in the comment tests above.
  const third = await postComment(SLUG2, { name: 'Chatty', body: 'three' });
  assert.equal(third.status, 201);
  const fourth = await postComment(SLUG2, { name: 'Chatty', body: 'four' });
  assert.equal(fourth.status, 429);
});

test('the emailed delete link removes the comment; reuse and bad signatures are safe', async () => {
  const { signDeleteToken } = await import('../../worker/lib.ts');
  const data = await (await fetch(`${BASE}/api/stories/${SLUG2}`)).json() as any;
  const target = data.comments[data.comments.length - 1];

  // Wrong signature: comment survives.
  const badSig = await signDeleteToken(target.id, 'wrong-secret');
  const forged = await fetch(`${BASE}/api/comments/${target.id}/delete?sig=${badSig}`);
  assert.equal(forged.status, 403);

  // Right signature (dev secret from .dev.vars): comment gone, page friendly.
  const sig = await signDeleteToken(target.id, 'local-dev-delete-secret');
  const res = await fetch(`${BASE}/api/comments/${target.id}/delete?sig=${sig}`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /removed/i);

  const after = await (await fetch(`${BASE}/api/stories/${SLUG2}`)).json() as any;
  assert.equal(after.comments.some((c: { id: string }) => c.id === target.id), false);

  // Clicking the link again (email links get re-clicked) stays a calm 200.
  const again = await fetch(`${BASE}/api/comments/${target.id}/delete?sig=${sig}`);
  assert.equal(again.status, 200);
});

test('batched like counts come back as a slug→count map (unknown slugs = 0)', async () => {
  const res = await fetch(`${BASE}/api/likes?slugs=${SLUG},${SLUG2},never-heard-of-it`);
  assert.equal(res.status, 200);
  const data = await res.json() as any;
  assert.equal(data[SLUG], 2); // liked twice in the like test
  assert.equal(data[SLUG2], 0);
  assert.equal(data['never-heard-of-it'], 0);
});

test('invalid fields get a 400 with a friendly message', async () => {
  const res = await postComment(SLUG2, { name: '', body: 'hi' });
  assert.equal(res.status, 400);
  const data = await res.json() as any;
  assert.match(data.error, /name/i);
});
