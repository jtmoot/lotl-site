// Parser port of reference/lotl-sync.gs, tested against real Bookwhen
// notification emails in tests/fixtures/. The parser must never leak an email
// address or phone number into its output.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseSubject,
  parseBody,
  parseRawEmail,
  slotType,
  eventKind,
  nameKey,
  inferSlotDate,
} from '../../worker/teesheet/parse.ts';

const fixture = (name: string) => readFileSync(`tests/fixtures/${name}`);
const NO_CONTACT = /@|\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/;
/** Everything the Worker persists or renders from a parse, minus the Message-ID (an opaque id that contains "@" by spec). */
const persisted = (r: { attendees: unknown; subject: string; ref: string }) =>
  JSON.stringify({ attendees: r.attendees, subject: r.subject, ref: r.ref });

// Both HW4R2 fixtures were received 24 Sep 2026, so "Thu 1 Oct" is 2026-10-01.
const RECEIVED = new Date('2026-09-24T17:57:29Z');

test('subject: the three known formats parse, everything else is unmatched', () => {
  assert.deepEqual(parseSubject('[Bookwhen] New booking. Ref: HW4R2 - Test - jimmy horn'), {
    ok: true,
    action: 'booked',
    ref: 'HW4R2',
  });
  assert.deepEqual(parseSubject('[Bookwhen] Booking cancelled. Ref: HW4R2 - Test - jimmy horn'), {
    ok: true,
    action: 'cancelled',
    ref: 'HW4R2',
  });
  assert.deepEqual(parseSubject('[Bookwhen] Ticket cancelled. Ref: ABC12 - Tee Time'), {
    ok: true,
    action: 'cancelled',
    ref: 'ABC12',
  });
  // A forwarded copy (backfill by forwarding) still matches.
  assert.equal(parseSubject('Fwd: [Bookwhen] New booking. Ref: ZZZ99 - Lesson').ok, true);

  const miss = parseSubject('[Bookwhen] Payment received. Ref: HW4R2');
  assert.equal(miss.ok, false);
  assert.equal(parseSubject('Your weekly digest').ok, false);
});

test('slot type mirrors the old script so email and API keys agree', () => {
  assert.equal(slotType('Tee Time ⛳'), 'tee_time');
  assert.equal(slotType('Copy 2 of: Tee Time ⛳'), 'tee_time');
  assert.equal(slotType('On-Course Beginners Only Lesson with Christian Grace'), 'oncourse_lesson');
  assert.equal(slotType('Lesson with Christian'), 'lesson');
  assert.equal(slotType('Sisters Twosome — 3:20 PM (Private) Ali & Robin '), 'other:sisters twosome — 3:20 pm (private) ali & robin');
  assert.equal(slotType('Copy of: GLO Golf Night'), 'other:glo golf night');
  assert.equal(eventKind('Tee Time ⛳'), 'tee_time');
  assert.equal(eventKind('On-Course Beginners Only Lesson'), 'lesson');
  assert.equal(eventKind('GLO Golf Night'), 'other');
  assert.equal(eventKind('Mystery', ['tee-time']), 'tee_time');
});

test('name keys normalize case and whitespace only', () => {
  assert.equal(nameKey('  Jane   DOE '), 'jane doe');
  assert.equal(nameKey('Sue (me) Wagoner'), 'sue (me) wagoner');
});

test('year inference: dates already past this month roll to next year', () => {
  // Received late December: "5 Jan" means next year, "28 Dec" means this year.
  const dec = new Date('2026-12-28T15:00:00Z');
  assert.equal(inferSlotDate(5, 1, dec), '2027-01-05');
  assert.equal(inferSlotDate(28, 12, dec), '2026-12-28');
  // Received in September: "1 Oct" is this year; "3 Jun" (earlier this year) rolls forward.
  assert.equal(inferSlotDate(1, 10, RECEIVED), '2026-10-01');
  assert.equal(inferSlotDate(3, 6, RECEIVED), '2027-06-03');
  // Same month, earlier day, still this year (the reference is the 1st of the month).
  assert.equal(inferSlotDate(2, 9, RECEIVED), '2026-09-02');
});

test('booking body: one attendee in one slot', () => {
  const text = `New booking: HW4R2

https://ladiesonthelinks.bookwhen.com/bookings/xjomietfyzsp

Booking contact: jimmyhorn@yahoo.com


Test
North Hill Country Club, 29 Merry Ave #4415, Duxbury MA 02332-4415
  Thu 1 Oct, 10:00am - 11:00am
    test ($0.00)
    jimmy horn <jimmyhorn@yahoo.com>
`;
  assert.deepEqual(parseBody(text, RECEIVED), [
    { name: 'jimmy horn', slotKey: '2026-10-01 10:00|other:test', cancelled: false },
  ]);
});

test('cancellation body: the trailing "- Cancelled" marks the seat', () => {
  const text = `Booking HW4R2 has been cancelled.

Booking contact: jimmyhorn@yahoo.com

Test
North Hill Country Club, 29 Merry Ave #4415, Duxbury MA 02332-4415
  Thu 1 Oct, 10:00am - 11:00am
    test ($0.00)
    jimmy horn <jimmyhorn@yahoo.com> - Cancelled
`;
  assert.deepEqual(parseBody(text, RECEIVED), [
    { name: 'jimmy horn', slotKey: '2026-10-01 10:00|other:test', cancelled: true },
  ]);
});

test('a booking can span event types and dates; the title is the line above each address', () => {
  const text = `New booking: MIXED

Booking contact: someone@example.com

Tee Time ⛳
North Hill Country Club, 29 Merry Ave #4415, Duxbury MA 02332-4415
  Mon 5 Oct, 3:40pm - 5:40pm
    Solo Spot ($45.00)
    Ann Golfer <ann@example.com>
  Mon 12 Oct, 3:40pm - 5:40pm
    Solo Spot ($45.00)
    Ann Golfer <ann@example.com> - Cancelled

Lesson with Christian
North Hill Country Club, 29 Merry Ave #4415, Duxbury MA 02332-4415
  Wed 7 Oct, 5:00pm - 6:00pm
    Lesson ($35.00)
    Ann Golfer <ann@example.com>
    Need to borrow clubs? Yes
`;
  assert.deepEqual(parseBody(text, RECEIVED), [
    { name: 'Ann Golfer', slotKey: '2026-10-05 15:40|tee_time', cancelled: false },
    { name: 'Ann Golfer', slotKey: '2026-10-12 15:40|tee_time', cancelled: true },
    { name: 'Ann Golfer', slotKey: '2026-10-07 17:00|lesson', cancelled: false },
  ]);
});

test('fixture: HW4R2 booking email', async () => {
  const r = await parseRawEmail(fixture('booking-hw4r2.eml'));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.action, 'booked');
  assert.equal(r.ref, 'HW4R2');
  assert.equal(r.messageId, '<6ab564889f757_7db0822402a@bgjobs-deployment-855898886d-d9t6l.mail>');
  assert.deepEqual(r.attendees, [
    { name: 'jimmy horn', slotKey: '2026-10-01 10:00|other:test', cancelled: false },
  ]);
  assert.doesNotMatch(persisted(r), NO_CONTACT);
});

test('fixture: HW4R2 cancellation email', async () => {
  const r = await parseRawEmail(fixture('cancel-hw4r2.eml'));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.action, 'cancelled');
  assert.equal(r.ref, 'HW4R2');
  assert.deepEqual(r.attendees, [
    { name: 'jimmy horn', slotKey: '2026-10-01 10:00|other:test', cancelled: true },
  ]);
  assert.doesNotMatch(persisted(r), NO_CONTACT);
});

test('fixture: CKKTT booking with two attendees on one ticket line', async () => {
  const r = await parseRawEmail(fixture('booking-ckktt-two-attendees.eml'));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.ref, 'CKKTT');
  assert.deepEqual(r.attendees, [
    { name: 'john marsh', slotKey: '2026-10-01 10:00|other:test', cancelled: false },
    { name: 'hi john', slotKey: '2026-10-01 10:00|other:test', cancelled: false },
  ]);
  assert.doesNotMatch(persisted(r), NO_CONTACT);
});

test('an unrecognized subject is reported, not thrown, and keeps the subject for the unparsed log', async () => {
  const raw = fixture('booking-hw4r2.eml')
    .toString('latin1')
    .replace('Subject: [Bookwhen] New booking. Ref: HW4R2 - Test - jimmy horn', 'Subject: [Bookwhen] Something new. Ref: HW4R2');
  const r = await parseRawEmail(Buffer.from(raw, 'latin1'));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.subject, '[Bookwhen] Something new. Ref: HW4R2');
  assert.match(r.reason, /subject/i);
});

test('a matched subject with no attendee lines is reported as unparsed', async () => {
  const raw = fixture('booking-hw4r2.eml')
    .toString('latin1')
    .replace(/jimmy horn <jimmyhorn@yahoo.com>/g, '(details withheld)');
  const r = await parseRawEmail(Buffer.from(raw, 'latin1'));
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.match(r.reason, /no attendees/i);
});
