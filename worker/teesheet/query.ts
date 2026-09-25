// Read side: assemble the tee sheet (slots + names + health) from D1.
// Windows are rolling and computed from `now` in league time; callers may pass
// explicit from/to dates (tests do) but nothing here hardcodes a date.
import type { D1Database } from '@cloudflare/workers-types';
import { LEAGUE_TZ } from './parse.ts';

export const UPCOMING_DAYS = 60;
export const PAST_DAYS = 90;

export interface SlotRow {
  slotKey: string;
  date: string;
  time: string;
  title: string | null;
  kind: string | null;
  attendeeCount: number | null;
  attendeeLimit: number | null;
  eventCancelled: boolean;
  /** Names currently booked, in booking order. */
  players: string[];
  /** Names that were booked in this slot and then cancelled. */
  cancelled: string[];
  /** Bookwhen's own count for this slot disagrees with the names listed (see getTeeSheet). */
  countMismatch: boolean;
}

export interface Health {
  lastEmailAt: string | null;
  emailsProcessed: number;
  emailLastError: string | null;
  emailLastErrorAt: string | null;
  apiLastOkAt: string | null;
  apiLastError: string | null;
  apiLastErrorAt: string | null;
  unparsedCount: number;
  unparsedLatestSubject: string | null;
  unparsedLatestAt: string | null;
  /** Booked names hidden because Bookwhen no longer lists their event. */
  orphanSeatsHidden: number;
  /** Slots where Bookwhen's attendee count differs from the names we list. */
  countMismatchSlots: number;
}

export interface TeeSheet {
  range: { from: string; to: string };
  generatedAt: string;
  slots: SlotRow[];
  health: Health;
}

/** YYYY-MM-DD for an instant in league time. */
export function leagueDate(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LEAGUE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Resolve a range from query params; invalid input falls back to the rolling default. */
export function resolveRange(
  params: URLSearchParams,
  now: Date
): { from: string; to: string; preset: 'upcoming' | 'past' | 'custom' } {
  const today = leagueDate(now);
  const from = params.get('from');
  const to = params.get('to');
  if (from && to && DATE_RE.test(from) && DATE_RE.test(to) && from <= to) {
    return { from, to, preset: 'custom' };
  }
  if (params.get('range') === 'past') {
    return { from: addDays(today, -PAST_DAYS), to: addDays(today, -1), preset: 'past' };
  }
  return { from: today, to: addDays(today, UPCOMING_DAYS), preset: 'upcoming' };
}

interface EventRow {
  slot_key: string;
  title: string;
  kind: string;
  attendee_count: number;
  attendee_limit: number | null;
  cancelled_at: string | null;
}
interface BookingRow {
  slot_key: string;
  name: string;
  status: 'booked' | 'cancelled';
  updated_at: string;
}

/** Grace after a successful API sync before an eventless slot counts as gone. */
const ORPHAN_GRACE_MS = 20 * 60 * 1000;

export async function getTeeSheet(db: D1Database, from: string, to: string, now: Date): Promise<TeeSheet> {
  // slot_key begins with YYYY-MM-DD, so a string range on it is a date range.
  const lo = from;
  const hi = addDays(to, 1);

  const [events, bookings, health] = await Promise.all([
    db
      .prepare(
        `SELECT slot_key, title, kind, attendee_count, attendee_limit, cancelled_at
         FROM events WHERE slot_key >= ? AND slot_key < ? ORDER BY slot_key, title`
      )
      .bind(lo, hi)
      .all<EventRow>(),
    db
      .prepare(
        `SELECT slot_key, name, status, updated_at FROM bookings
         WHERE slot_key >= ? AND slot_key < ? ORDER BY slot_key, updated_at, name`
      )
      .bind(lo, hi)
      .all<BookingRow>(),
    getHealth(db, now),
  ]);

  const slots = new Map<string, SlotRow>();
  const ensure = (key: string): SlotRow => {
    let s = slots.get(key);
    if (!s) {
      const [stamp] = key.split('|');
      const [date, time] = stamp.split(' ');
      s = {
        slotKey: key,
        date,
        time,
        title: null,
        kind: null,
        attendeeCount: null,
        attendeeLimit: null,
        eventCancelled: false,
        players: [],
        cancelled: [],
        countMismatch: false,
      };
      slots.set(key, s);
    }
    return s;
  };
  // Newest booking change per slot; drift checks only fire once the API has synced after it.
  const lastChange = new Map<string, string>();
  const fromApi = new Set<string>();

  for (const e of events.results) {
    const s = ensure(e.slot_key);
    // Several Bookwhen events can share a slot key (e.g. "Copy of:" duplicates); pool capacity.
    s.title = s.title ?? e.title;
    s.kind = s.kind ?? e.kind;
    s.attendeeCount = (s.attendeeCount ?? 0) + e.attendee_count;
    if (e.attendee_limit !== null) s.attendeeLimit = (s.attendeeLimit ?? 0) + e.attendee_limit;
    s.eventCancelled = s.eventCancelled || e.cancelled_at !== null;
    // Only events the cron fetched carry a limit; imported ones never do.
    if (e.attendee_limit !== null) fromApi.add(e.slot_key);
  }
  for (const b of bookings.results) {
    const s = ensure(b.slot_key);
    (b.status === 'booked' ? s.players : s.cancelled).push(b.name);
    const prev = lastChange.get(b.slot_key);
    if (!prev || b.updated_at > prev) lastChange.set(b.slot_key, b.updated_at);
  }

  // Drift detection. Bookwhen sends no email when an event is deleted, and
  // none for anything else that removes a booking without cancelling it, so
  // compare against what the API last reported. Both checks wait until the
  // API has synced after the slot's newest booking change, otherwise a fresh
  // booking would be flagged for the up-to-15-minutes before the cron runs.
  const today = leagueDate(now);
  const apiWindowEnd = addDays(today, UPCOMING_DAYS);
  const syncedAt = health.apiLastOkAt ? new Date(health.apiLastOkAt).getTime() : null;
  let orphanSeatsHidden = 0;
  let countMismatchSlots = 0;
  const visible: SlotRow[] = [];
  for (const s of slots.values()) {
    const changed = lastChange.get(s.slotKey);
    const changedAt = changed ? new Date(changed).getTime() : 0;
    const settled = syncedAt !== null && changedAt < syncedAt;
    if (s.title === null && settled && s.date >= today && s.date <= apiWindowEnd && changedAt < syncedAt - ORPHAN_GRACE_MS) {
      // Bookwhen no longer lists this event: hide the names rather than show a ghost row.
      orphanSeatsHidden += s.players.length;
      continue;
    }
    if (s.title !== null && fromApi.has(s.slotKey) && settled && s.attendeeCount !== null && s.attendeeCount !== s.players.length) {
      s.countMismatch = true;
      countMismatchSlots += 1;
    }
    visible.push(s);
  }
  health.orphanSeatsHidden = orphanSeatsHidden;
  health.countMismatchSlots = countMismatchSlots;

  const ordered = visible.sort((a, b) => a.slotKey.localeCompare(b.slotKey));
  return { range: { from, to }, generatedAt: now.toISOString(), slots: ordered, health };
}

export async function getHealth(db: D1Database, now: Date): Promise<Health> {
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [emails, state, unparsed, latestUnparsed] = await Promise.all([
    db
      .prepare('SELECT MAX(received_at) AS last_at, COUNT(*) AS n FROM processed_messages')
      .first<{ last_at: string | null; n: number }>(),
    db.prepare('SELECT key, value FROM sync_state').all<{ key: string; value: string }>(),
    db
      .prepare('SELECT COUNT(*) AS n FROM unparsed WHERE received_at >= ?')
      .bind(since)
      .first<{ n: number }>(),
    db
      .prepare('SELECT subject, received_at FROM unparsed ORDER BY received_at DESC LIMIT 1')
      .first<{ subject: string; received_at: string }>(),
  ]);
  const kv = Object.fromEntries(state.results.map((r) => [r.key, r.value]));
  return {
    lastEmailAt: emails?.last_at ?? null,
    emailsProcessed: emails?.n ?? 0,
    emailLastError: kv.email_last_error ?? null,
    emailLastErrorAt: kv.email_last_error_at ?? null,
    apiLastOkAt: kv.api_last_ok_at ?? null,
    apiLastError: kv.api_last_error ?? null,
    apiLastErrorAt: kv.api_last_error_at ?? null,
    unparsedCount: unparsed?.n ?? 0,
    unparsedLatestSubject: latestUnparsed?.subject ?? null,
    unparsedLatestAt: latestUnparsed?.received_at ?? null,
    orphanSeatsHidden: 0,
    countMismatchSlots: 0,
  };
}
