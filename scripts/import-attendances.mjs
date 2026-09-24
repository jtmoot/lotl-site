#!/usr/bin/env node
// One-time backfill: Bookwhen "attendances" CSV export -> SQL for the tee-sheet
// tables. Reads ONLY event + name + ticket-status columns; contact details in
// the export are never touched. The CSV itself must never be committed.
//
//   node scripts/import-attendances.mjs ~/Downloads/attendances_export_*.csv
//   npx wrangler d1 execute lotl-comments --local --file .wrangler/import-attendances.sql
//   npx wrangler d1 execute lotl-comments --remote --file .wrangler/import-attendances.sql
//
// Import rows never overwrite rows that came from live emails, and events are
// INSERT OR IGNORE so the cron stays authoritative for anything it covers.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { slotType, eventKind, nameKey } from '../worker/teesheet/parse.ts';
import { leagueStamp } from '../worker/teesheet/bookwhen.ts';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((h) => h.replace(/^﻿/, '').trim());
  return rows.filter((r) => r.some((v) => v !== '')).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

/** "2026-06-01 15:20:00 -0400" -> Date */
export function parseBookwhenTime(s) {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}${m[3]}:${m[4]}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`);

export function buildImport(records, now = new Date()) {
  const events = new Map();
  const bookings = new Map();
  const skipped = [];

  for (const r of records) {
    const start = parseBookwhenTime(r['Event starts'] ?? '');
    const title = (r['Event title'] ?? '').trim();
    const eventId = (r['EventID'] ?? '').trim();
    const name = (r['Full name'] || r['Attendee customer name'] || r['Contact name'] || '').trim();
    if (!start || !title || !eventId || !name) {
      skipped.push(`${r['AttendanceID'] ?? '?'}: missing ${!start ? 'start' : !title ? 'title' : !eventId ? 'event id' : 'name'}`);
      continue;
    }
    const cancelled = (r['Ticket cancelled'] ?? '').trim() !== '' || ((r['Ticket status'] ?? 'active').trim() !== 'active');
    const slotKey = `${leagueStamp(start)}|${slotType(title)}`;
    const end = parseBookwhenTime(r['Event ends'] ?? '');
    const eventCancelled = (r['Event cancelled'] ?? '').trim();

    const ev = events.get(eventId) ?? {
      id: eventId, title, start_at: start.toISOString(), end_at: end ? end.toISOString() : null,
      slot_key: slotKey, kind: eventKind(title), attendee_count: 0,
      cancelled_at: eventCancelled ? (parseBookwhenTime(eventCancelled)?.toISOString() ?? now.toISOString()) : null,
    };
    if (!cancelled) ev.attendee_count += 1;
    events.set(eventId, ev);

    const key = `${slotKey}\u0000${nameKey(name)}`;
    const created = parseBookwhenTime(r['Booking created'] ?? '') ?? now;
    const prev = bookings.get(key);
    // Same person, same slot, several tickets: any live ticket wins over a cancelled one.
    if (!prev || (prev.status === 'cancelled' && !cancelled) || (prev.status === (cancelled ? 'cancelled' : 'booked') && created > prev.created)) {
      bookings.set(key, { slot_key: slotKey, name_key: nameKey(name), name, ref: (r['Booking ref'] ?? '').trim().toUpperCase() || null, status: cancelled ? 'cancelled' : 'booked', created });
    }
  }

  const stamp = now.toISOString();
  const sql = [
    `-- Generated ${stamp} by scripts/import-attendances.mjs. Names only.`,
    ...[...events.values()].map((e) =>
      `INSERT OR IGNORE INTO events (id, title, start_at, end_at, slot_key, kind, attendee_count, attendee_limit, cancelled_at, synced_at) VALUES (${q(e.id)}, ${q(e.title)}, ${q(e.start_at)}, ${q(e.end_at)}, ${q(e.slot_key)}, ${q(e.kind)}, ${e.attendee_count}, NULL, ${q(e.cancelled_at)}, ${q(stamp)});`
    ),
    ...[...bookings.values()].map((b) =>
      `INSERT INTO bookings (slot_key, name_key, name, ref, status, source, message_id, updated_at) VALUES (${q(b.slot_key)}, ${q(b.name_key)}, ${q(b.name)}, ${q(b.ref)}, ${q(b.status)}, 'import', NULL, ${q(b.created.toISOString())}) ON CONFLICT(slot_key, name_key) DO UPDATE SET name = excluded.name, ref = COALESCE(excluded.ref, bookings.ref), status = excluded.status, updated_at = excluded.updated_at WHERE bookings.source = 'import';`
    ),
  ].join('\n') + '\n';

  return { sql, events: events.size, bookings: bookings.size, skipped };
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const [csvPath, outPath = '.wrangler/import-attendances.sql'] = process.argv.slice(2);
  if (!csvPath) {
    console.error('usage: node scripts/import-attendances.mjs <attendances.csv> [out.sql]');
    process.exit(2);
  }
  const records = parseCsv(readFileSync(csvPath, 'utf8'));
  const result = buildImport(records);
  if (/@/.test(result.sql)) {
    console.error('refusing to write: generated SQL contains an "@" (possible email address)');
    process.exit(1);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, result.sql);
  console.log(`rows: ${records.length}  events: ${result.events}  bookings: ${result.bookings}  skipped: ${result.skipped.length}`);
  for (const s of result.skipped) console.log(`  skipped ${s}`);
  console.log(`wrote ${outPath}`);
}
