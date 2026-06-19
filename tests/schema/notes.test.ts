import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteSchema } from '../../src/content/schemas.ts';

test('a valid entry parses', () => {
  const result = noteSchema.safeParse({ title: 'Recap', date: '2026-06-18' });
  assert.equal(result.success, true);
});

test('coerces an ISO date string into a Date', () => {
  const result = noteSchema.parse({ title: 'Recap', date: '2026-06-18' });
  assert.ok(result.date instanceof Date);
});

test('rejects an entry missing the required title', () => {
  const result = noteSchema.safeParse({ date: '2026-06-18' });
  assert.equal(result.success, false);
});

test('rejects an empty title', () => {
  const result = noteSchema.safeParse({ title: '', date: '2026-06-18' });
  assert.equal(result.success, false);
});

test('rejects an unparseable date', () => {
  const result = noteSchema.safeParse({ title: 'Recap', date: 'not-a-date' });
  assert.equal(result.success, false);
});
