// Bookwhen v2 API client for events (times + capacity). The API exposes no
// booking/attendee data; names come from emails (see ingest.ts).
// Pure helpers are exported for unit tests; syncEvents does the I/O.
import type { D1Database } from '@cloudflare/workers-types';
import { LEAGUE_TZ, eventKind, slotType } from './parse.ts';
import { addDays, leagueDate, UPCOMING_DAYS } from './query.ts';

export const DEFAULT_API_BASE = 'https://api.bookwhen.com/v2';
const MAX_PAGES = 50;

export interface BookwhenEventItem {
  id: string;
  attributes?: {
    title?: string;
    start_at?: string;
    end_at?: string | null;
    attendee_count?: number | null;
    attendee_limit?: number | null;
    cancelled_at?: string | null;
    tags?: string[] | string | null;
  };
}

export interface EventRow {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  slot_key: string;
  kind: string;
  attendee_count: number;
  attendee_limit: number | null;
  cancelled_at: string | null;
}

/** filter[from]/filter[to] take yyyymmdd; page[offset] paginates. */
export function buildEventsUrl(base: string, from: string, to: string, offset: number): string {
  const compact = (d: string) => d.replaceAll('-', '');
  const q = new URLSearchParams({
    'filter[from]': compact(from),
    'filter[to]': compact(to),
    'page[offset]': String(offset),
  });
  return `${base.replace(/\/$/, '')}/events?${q}`;
}

export function authHeader(token: string): string {
  return 'Basic ' + btoa(`${token}:`);
}

/** "YYYY-MM-DD HH:MM" of an instant in league time. */
export function leagueStamp(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LEAGUE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

export function mapEvent(item: BookwhenEventItem): EventRow | null {
  const a = item.attributes ?? {};
  const title = (a.title ?? '').trim();
  if (!item.id || !a.start_at || !title) return null;
  const start = new Date(a.start_at);
  if (Number.isNaN(start.getTime())) return null;
  const tags = Array.isArray(a.tags) ? a.tags.map(String) : a.tags ? [String(a.tags)] : [];
  return {
    id: item.id,
    title,
    start_at: start.toISOString(),
    end_at: a.end_at ? new Date(a.end_at).toISOString() : null,
    slot_key: `${leagueStamp(start)}|${slotType(title)}`,
    kind: eventKind(title, tags),
    attendee_count: Number(a.attendee_count ?? 0),
    attendee_limit: a.attendee_limit === null || a.attendee_limit === undefined ? null : Number(a.attendee_limit),
    cancelled_at: a.cancelled_at ?? null,
  };
}

export interface SyncDeps {
  apiBase: string;
  token: string;
  fetch: typeof fetch;
}

export interface SyncResult {
  from: string;
  to: string;
  fetched: number;
  removed: number;
}

/** Fetch every page of events in [from, to]. Throws on any non-200 or API error. */
export async function fetchEvents(deps: SyncDeps, from: string, to: string): Promise<EventRow[]> {
  const rows: EventRow[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await deps.fetch(buildEventsUrl(deps.apiBase, from, to, offset), {
      headers: { authorization: authHeader(deps.token), accept: 'application/json' },
    });
    if (res.status !== 200) {
      const body = (await res.text()).slice(0, 300);
      throw new Error(`Bookwhen API HTTP ${res.status}: ${body}`);
    }
    const payload = (await res.json()) as { data?: BookwhenEventItem[]; errors?: unknown; links?: { next?: string | null } };
    if (payload.errors) throw new Error(`Bookwhen API error: ${JSON.stringify(payload.errors).slice(0, 300)}`);
    const data = payload.data ?? [];
    for (const item of data) {
      const row = mapEvent(item);
      if (row) rows.push(row);
    }
    if (data.length === 0 || (payload.links && !payload.links.next)) break;
    offset += data.length;
  }
  return rows;
}

/**
 * Pull the rolling window (today .. today + UPCOMING_DAYS, league time) into
 * `events`, drop events in that window Bookwhen no longer returns, and record
 * the outcome in sync_state. Failures are recorded, then rethrown.
 */
export async function syncEvents(db: D1Database, deps: SyncDeps, now: Date = new Date()): Promise<SyncResult> {
  const from = leagueDate(now);
  const to = addDays(from, UPCOMING_DAYS);
  const stamp = now.toISOString();
  try {
    const rows = await fetchEvents(deps, from, to);
    const statements = rows.map((r) =>
      db
        .prepare(
          `INSERT INTO events (id, title, start_at, end_at, slot_key, kind, attendee_count, attendee_limit, cancelled_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title, start_at = excluded.start_at, end_at = excluded.end_at,
             slot_key = excluded.slot_key, kind = excluded.kind,
             attendee_count = excluded.attendee_count, attendee_limit = excluded.attendee_limit,
             cancelled_at = excluded.cancelled_at, synced_at = excluded.synced_at`
        )
        .bind(r.id, r.title, r.start_at, r.end_at, r.slot_key, r.kind, r.attendee_count, r.attendee_limit, r.cancelled_at, stamp)
    );
    // Anything in the window that this run did not touch has been deleted upstream.
    const sweep = db
      .prepare(`DELETE FROM events WHERE slot_key >= ? AND slot_key < ? AND synced_at < ?`)
      .bind(from, addDays(to, 1), stamp);
    const okState = db
      .prepare(
        `INSERT INTO sync_state (key, value, updated_at) VALUES ('api_last_ok_at', ?1, ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .bind(stamp);
    const clearErr = db.prepare(`DELETE FROM sync_state WHERE key IN ('api_last_error', 'api_last_error_at')`);
    const results = await db.batch([...statements, sweep, okState, clearErr]);
    const removed = results[statements.length]?.meta?.changes ?? 0;
    return { from, to, fetched: rows.length, removed };
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO sync_state (key, value, updated_at) VALUES ('api_last_error', ?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
          )
          .bind(message.slice(0, 500), stamp),
        db
          .prepare(
            `INSERT INTO sync_state (key, value, updated_at) VALUES ('api_last_error_at', ?1, ?1)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
          )
          .bind(stamp),
      ]);
    } catch {
      // D1 itself is down; nothing more to record. The rethrow below surfaces it in logs.
    }
    throw err;
  }
}
