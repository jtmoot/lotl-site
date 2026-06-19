import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyEntrySchema } from '../../src/content/schemas.ts';

const valid = {
  cover: '../../assets/photos/gallery/nh-gallery-1.jpg',
  title: 'A great Monday at North Hill',
  date: '2026-06-15',
  author: 'Ladies on the Links',
  attribution: 'Melissa',
};

test('a valid entry parses', () => {
  const result = storyEntrySchema.safeParse(valid);
  assert.equal(result.success, true);
});

test('a minimal entry (cover, title, date, author) parses', () => {
  const result = storyEntrySchema.safeParse({
    cover: 'a.jpg',
    title: 'Recap',
    date: '2026-06-15',
    author: 'Stacey',
  });
  assert.equal(result.success, true);
});

test('attribution is optional', () => {
  const { attribution, ...withoutAttribution } = valid;
  assert.equal(storyEntrySchema.safeParse(withoutAttribution).success, true);
  assert.equal(storyEntrySchema.safeParse(valid).success, true);
});

test('coerces an ISO date string into a Date', () => {
  const result = storyEntrySchema.parse(valid);
  assert.ok(result.date instanceof Date);
});

test('defaults draft to false', () => {
  const result = storyEntrySchema.parse(valid);
  assert.equal(result.draft, false);
});

test('rejects an entry missing a title', () => {
  const { title, ...noTitle } = valid;
  assert.equal(storyEntrySchema.safeParse(noTitle).success, false);
});

test('rejects an entry missing an author', () => {
  const { author, ...noAuthor } = valid;
  assert.equal(storyEntrySchema.safeParse(noAuthor).success, false);
});

test('rejects an entry missing a cover', () => {
  const { cover, ...noCover } = valid;
  assert.equal(storyEntrySchema.safeParse(noCover).success, false);
});

test('rejects an empty-string cover', () => {
  const result = storyEntrySchema.safeParse({ ...valid, cover: '' });
  assert.equal(result.success, false);
});

test('rejects an unparseable date', () => {
  const result = storyEntrySchema.safeParse({ ...valid, date: 'not-a-date' });
  assert.equal(result.success, false);
});
