import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateComment, signDeleteToken, verifyDeleteToken } from '../../worker/lib.ts';

test('a delete token round-trips, and tampering or a wrong secret fails', async () => {
  const sig = await signDeleteToken('comment-123', 'secret-a');
  assert.equal(await verifyDeleteToken('comment-123', sig, 'secret-a'), true);
  assert.equal(await verifyDeleteToken('comment-999', sig, 'secret-a'), false); // different id
  assert.equal(await verifyDeleteToken('comment-123', sig, 'secret-b'), false); // wrong secret
  assert.equal(await verifyDeleteToken('comment-123', 'not-a-signature', 'secret-a'), false);
  assert.equal(await verifyDeleteToken('comment-123', '', 'secret-a'), false);
});

test('oversize name or body is rejected with a friendly error', () => {
  const longName = validateComment({ name: 'x'.repeat(81), body: 'hi', website: '' });
  assert.equal(longName.ok, false);
  const longBody = validateComment({ name: 'Mel', body: 'x'.repeat(2001), website: '' });
  assert.equal(longBody.ok, false);
  const maxed = validateComment({ name: 'x'.repeat(80), body: 'x'.repeat(2000), website: '' });
  assert.equal(maxed.ok, true);
});

test('a filled honeypot flags the comment as spam', () => {
  const result = validateComment({ name: 'Bot', body: 'buy stuff', website: 'https://spam.example' });
  assert.deepEqual(result, { ok: false, error: 'spam', spam: true });
});

test('a well-formed comment validates and is trimmed', () => {
  const result = validateComment({
    name: '  Melissa ',
    email: 'mel@example.com',
    body: '  What a great story! ',
    website: '',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, 'Melissa');
    assert.equal(result.value.email, 'mel@example.com');
    assert.equal(result.value.body, 'What a great story!');
  }
});
