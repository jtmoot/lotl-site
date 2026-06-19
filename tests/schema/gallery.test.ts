import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryEntrySchema } from '../../src/content/schemas.ts';

const valid = {
  images: ['../../assets/photos/gallery/nh-gallery-1.jpg'],
  alt: 'A scenic fairway at North Hill Country Club',
  event: 'North Hill Country Club',
  date: '2026-06-18',
};

test('a valid entry parses', () => {
  const result = galleryEntrySchema.safeParse(valid);
  assert.equal(result.success, true);
});

test('a minimal entry (only images) parses', () => {
  const result = galleryEntrySchema.safeParse({ images: ['a.jpg'] });
  assert.equal(result.success, true);
});

test('coerces an ISO date string into a Date', () => {
  const result = galleryEntrySchema.parse(valid);
  assert.ok(result.date instanceof Date);
});

test('defaults draft to false', () => {
  const result = galleryEntrySchema.parse({ images: ['a.jpg'] });
  assert.equal(result.draft, false);
});

test('rejects an entry missing images entirely', () => {
  const result = galleryEntrySchema.safeParse({ alt: 'no image here' });
  assert.equal(result.success, false);
});

test('rejects an empty images array', () => {
  const result = galleryEntrySchema.safeParse({ images: [] });
  assert.equal(result.success, false);
});

test('rejects an empty-string image filename', () => {
  const result = galleryEntrySchema.safeParse({ images: [''] });
  assert.equal(result.success, false);
});

test('rejects an unparseable date', () => {
  const result = galleryEntrySchema.safeParse({ images: ['a.jpg'], date: 'not-a-date' });
  assert.equal(result.success, false);
});
