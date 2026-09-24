// Email ingest: raw Bookwhen notification -> D1. Idempotent on Message-ID.
// Nothing here is swallowed: unmatched mail lands in `unparsed`, and a storage
// failure is recorded in `sync_state` before being rethrown.
import type { D1Database } from '@cloudflare/workers-types';
import { parseRawEmail, nameKey, type ParseResult } from './parse';

export type IngestOutcome =
  | { outcome: 'stored'; ref: string; seats: number }
  | { outcome: 'duplicate' }
  | { outcome: 'unparsed'; reason: string };

export async function ingestEmail(
  db: D1Database,
  raw: string | ArrayBuffer | Uint8Array | ReadableStream<Uint8Array>,
  now: Date = new Date()
): Promise<IngestOutcome> {
  let parsed: ParseResult;
  try {
    parsed = await parseRawEmail(raw, now);
  } catch (err) {
    await recordError(db, `MIME parse failed: ${describe(err)}`, now);
    await db
      .prepare('INSERT INTO unparsed (id, message_id, subject, received_at, reason) VALUES (?, NULL, ?, ?, ?)')
      .bind(crypto.randomUUID(), '(unreadable message)', now.toISOString(), `MIME parse failed: ${describe(err)}`)
      .run();
    return { outcome: 'unparsed', reason: 'MIME parse failed' };
  }

  // A message with no Message-ID can't be deduped; synthesize one from the
  // subject + received time so a redelivery within the same second still collapses.
  const messageId = parsed.messageId || `<synthetic:${parsed.receivedAt}:${parsed.subject}>`;

  try {
    if (await alreadySeen(db, messageId)) return { outcome: 'duplicate' };

    if (!parsed.ok) {
      await db
        .prepare('INSERT INTO unparsed (id, message_id, subject, received_at, reason) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), messageId, parsed.subject, parsed.receivedAt, parsed.reason)
        .run();
      return { outcome: 'unparsed', reason: parsed.reason };
    }

    const statements = parsed.attendees.map((a) =>
      db
        .prepare(
          `INSERT INTO bookings (slot_key, name_key, name, ref, status, source, message_id, updated_at)
           VALUES (?, ?, ?, ?, ?, 'email', ?, ?)
           ON CONFLICT(slot_key, name_key) DO UPDATE SET
             name = excluded.name,
             ref = COALESCE(NULLIF(excluded.ref, ''), bookings.ref),
             status = excluded.status,
             source = 'email',
             message_id = excluded.message_id,
             updated_at = excluded.updated_at`
        )
        .bind(
          a.slotKey,
          nameKey(a.name),
          a.name,
          parsed.ref || null,
          a.cancelled ? 'cancelled' : 'booked',
          messageId,
          parsed.receivedAt
        )
    );
    statements.push(
      db
        .prepare(
          'INSERT INTO processed_messages (message_id, subject, received_at, action, ref) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(messageId, parsed.subject, parsed.receivedAt, parsed.action, parsed.ref || null)
    );
    await db.batch(statements);
    return { outcome: 'stored', ref: parsed.ref, seats: parsed.attendees.length };
  } catch (err) {
    await recordError(db, describe(err), now);
    throw err;
  }
}

async function alreadySeen(db: D1Database, messageId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS hit FROM processed_messages WHERE message_id = ?1
       UNION ALL
       SELECT 1 FROM unparsed WHERE message_id = ?1
       LIMIT 1`
    )
    .bind(messageId)
    .first<{ hit: number }>();
  return row !== null;
}

async function recordError(db: D1Database, message: string, now: Date): Promise<void> {
  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO sync_state (key, value, updated_at) VALUES ('email_last_error', ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        .bind(message.slice(0, 500), now.toISOString()),
      db
        .prepare(
          `INSERT INTO sync_state (key, value, updated_at) VALUES ('email_last_error_at', ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        .bind(now.toISOString(), now.toISOString()),
    ]);
  } catch {
    // If D1 itself is down there is nowhere left to write; the caller rethrows.
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}
