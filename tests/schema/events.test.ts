import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventEntrySchema } from '../../src/content/schemas.ts';

const valid = {
  title: 'Evening Glo Golf',
  tagline: 'Nine holes under the lights.',
  status: 'upcoming',
  bookingUrl: '/schedule',
  image: '../../assets/photos/gallery/league-01.jpg',
};

test('a valid entry parses', () => {
  assert.equal(eventEntrySchema.safeParse(valid).success, true);
});

test('a minimal entry (title + tagline) parses with defaults', () => {
  const r = eventEntrySchema.parse({ title: 'T', tagline: 'x' });
  assert.equal(r.status, 'upcoming');
  assert.equal(r.draft, false);
});

test('coerces an ISO date string into a Date', () => {
  const r = eventEntrySchema.parse({ ...valid, date: '2026-08-10' });
  assert.ok(r.date instanceof Date);
});

test('accepts a free-text dateLabel', () => {
  const r = eventEntrySchema.parse({
    title: 'Trip',
    tagline: 'x',
    dateLabel: 'Summer 2027',
    status: 'teaser',
  });
  assert.equal(r.dateLabel, 'Summer 2027');
});

test('rejects a missing title', () => {
  assert.equal(eventEntrySchema.safeParse({ tagline: 'x' }).success, false);
});

test('rejects a missing tagline', () => {
  assert.equal(eventEntrySchema.safeParse({ title: 'T' }).success, false);
});

test('rejects an unknown status', () => {
  assert.equal(
    eventEntrySchema.safeParse({ title: 'T', tagline: 'x', status: 'someday' }).success,
    false
  );
});

test('rejects an unparseable date', () => {
  assert.equal(
    eventEntrySchema.safeParse({ title: 'T', tagline: 'x', date: 'not-a-date' }).success,
    false
  );
});
