// Bookwhen notification email parser. Port of parseBookingEmail_ and friends
// from reference/lotl-sync.gs. Pure functions, no I/O, no D1.
//
// Privacy contract: email addresses are used only to find where a name ends
// on an attendee line and are never returned. Phone numbers are never read.

import PostalMime from 'postal-mime';

export type Action = 'booked' | 'cancelled';

export interface Attendee {
  name: string;
  /** "YYYY-MM-DD HH:MM|<slot type>" in league (America/New_York) time. */
  slotKey: string;
  /** Per-seat flag: the line ended in "- Cancelled". */
  cancelled: boolean;
}

export type SubjectResult =
  | { ok: true; action: Action; ref: string }
  | { ok: false; reason: string };

export type ParseResult =
  | {
      ok: true;
      action: Action;
      ref: string;
      subject: string;
      messageId: string;
      receivedAt: string;
      attendees: Attendee[];
    }
  | { ok: false; subject: string; messageId: string; receivedAt: string; reason: string };

export const LEAGUE_TZ = 'America/New_York';

// --- Subject ---------------------------------------------------------------
// "[Bookwhen] New booking. Ref: HW4R2 - Test - jimmy horn"
// "[Bookwhen] Booking cancelled. Ref: HW4R2 - Test - jimmy horn"
// "[Bookwhen] Ticket cancelled. Ref: ABC12 - Tee Time"
// Leading Fwd:/Re: is tolerated so forwarded copies (backfill) still parse.
const SUBJECT_RE =
  /^\s*(?:(?:fwd?|re)\s*:\s*)*\[Bookwhen\]\s+(New booking|Booking cancelled|Ticket cancelled)\.?\s+Ref:\s*([A-Za-z0-9]+)/i;

export function parseSubject(subject: string): SubjectResult {
  const m = SUBJECT_RE.exec(subject);
  if (!m) return { ok: false, reason: 'subject did not match a known Bookwhen format' };
  const action: Action = /^new booking$/i.test(m[1]) ? 'booked' : 'cancelled';
  return { ok: true, action, ref: m[2].toUpperCase() };
}

// Body fallback when the subject carries no ref. Matches both
// "New booking: HW4R2" and "Booking HW4R2 has been cancelled".
const BODY_REF_RE = /(?:booking:\s*|booking\s+)([A-Z0-9]{4,})\b/i;

// --- Slot typing (must agree with the API side; see bookwhen.ts) -----------

export function cleanEventName(title: string): string {
  return String(title ?? '').replace(/^Copy(?:\s+\d+)?\s+of:\s*/i, '').trim();
}

/** Coarse type used for matching names to events. */
export function slotType(title: string): string {
  const t = cleanEventName(title).toLowerCase();
  if (t.includes('tee time') || t.includes('tee-time')) return 'tee_time';
  if (t.includes('on-course') || t.includes('on course')) return 'oncourse_lesson';
  if (t.includes('lesson')) return 'lesson';
  return 'other:' + t.replace(/\s+/g, ' ').trim();
}

/** Coarser kind stored on events for display grouping. */
export function eventKind(title: string, tags: string[] = []): 'tee_time' | 'lesson' | 'other' {
  const hay = (cleanEventName(title) + ' ' + tags.join(' ')).toLowerCase();
  if (hay.includes('tee time') || hay.includes('tee-time')) return 'tee_time';
  if (hay.includes('lesson')) return 'lesson';
  return 'other';
}

export function nameKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function makeSlotKey(date: string, hh: number, mm: number, title: string): string {
  return `${date} ${pad2(hh)}:${pad2(mm)}|${slotType(title)}`;
}

// --- Dates -----------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// "Thu 1 Oct, 10:00am - 11:00am"  /  "Mon 6 Jul, 3:40pm - 5:40pm"
const DATETIME_RE =
  /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*,?\s*(\d{1,2}):(\d{2})\s*(am|pm)/i;

/** Year and month of an instant, in league time. */
export function leagueYearMonth(instant: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LEAGUE_TZ,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get('year'), month: get('month') };
}

/**
 * Bookwhen omits the year. Infer it from when the email was received: any
 * month earlier than the received month belongs to next year (the old
 * script's rule), so a September email saying "3 Jun" means next June.
 */
export function inferSlotDate(day: number, month: number, receivedAt: Date): string {
  const ref = leagueYearMonth(receivedAt);
  const year = month < ref.month ? ref.year + 1 : ref.year;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseDateTimeLine(line: string, receivedAt: Date): { date: string; hh: number; mm: number } | null {
  const m = DATETIME_RE.exec(line);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  let hh = Number(m[3]) % 12;
  if (m[5].toLowerCase() === 'pm') hh += 12;
  return { date: inferSlotDate(day, month, receivedAt), hh, mm: Number(m[4]) };
}

// --- Body ------------------------------------------------------------------

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;

function isLocationLine(line: string): boolean {
  return /north hill country club|merry ave/i.test(line);
}

/**
 * Walk the plain-text body. The event title is the line directly above each
 * venue address line; a date/time line opens a slot under that title; each
 * "Name <email>" line under a slot is one seat, cancelled if the line ends in
 * "Cancelled". A single email may mix event types and dates.
 */
export function parseBody(text: string, receivedAt: Date): Attendee[] {
  const out: Attendee[] = [];
  let currentTitle = '';
  let currentSlot: { date: string; hh: number; mm: number } | null = null;
  let prevLine = '';

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (isLocationLine(line)) {
      currentTitle = prevLine;
      currentSlot = null;
      prevLine = line;
      continue;
    }

    const dt = parseDateTimeLine(line, receivedAt);
    if (dt) {
      currentSlot = dt;
      prevLine = line;
      continue;
    }

    if (currentSlot) {
      const em = EMAIL_RE.exec(line);
      if (em && !/^booking contact/i.test(line)) {
        const name = line.slice(0, em.index).replace(/[<(\[,\s]+$/, '').trim();
        if (name) {
          const tail = line.slice(em.index + em[0].length);
          out.push({
            name,
            slotKey: makeSlotKey(currentSlot.date, currentSlot.hh, currentSlot.mm, currentTitle),
            cancelled: /\bcancelled\b/i.test(tail),
          });
        }
      }
    }
    prevLine = line;
  }
  return out;
}

// --- Whole message ---------------------------------------------------------

function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Parse a raw RFC 5322 message (string, bytes, or stream) end to end. */
export async function parseRawEmail(
  raw: string | ArrayBuffer | Uint8Array | ReadableStream<Uint8Array>,
  fallbackReceivedAt: Date = new Date()
): Promise<ParseResult> {
  const mail = await PostalMime.parse(raw as never);
  const subject = (mail.subject ?? '').trim();
  const messageId = (mail.messageId ?? '').trim();
  const received = mail.date ? new Date(mail.date) : fallbackReceivedAt;
  const receivedAt = (Number.isNaN(received.getTime()) ? fallbackReceivedAt : received).toISOString();
  const receivedDate = new Date(receivedAt);

  const subj = parseSubject(subject);
  if (!subj.ok) return { ok: false, subject, messageId, receivedAt, reason: subj.reason };

  const text = mail.text && mail.text.trim() ? mail.text : htmlToText(mail.html ?? '');
  const attendees = parseBody(text, receivedDate);
  if (attendees.length === 0) {
    return { ok: false, subject, messageId, receivedAt, reason: 'no attendees found in body' };
  }

  const ref = subj.ref || BODY_REF_RE.exec(text)?.[1]?.toUpperCase() || '';
  return { ok: true, action: subj.action, ref, subject, messageId, receivedAt, attendees };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
