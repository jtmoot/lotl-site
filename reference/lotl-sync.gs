/**
 * Ladies on the Links — Tee Sheet Sync (Google Apps Script, bound to the Sheet).
 *
 * Pulls events from the Bookwhen API (times/capacity) and attendee names from
 * Bookwhen "New booking" / "Ticket cancelled" / "Booking cancelled" emails in
 * this account's Gmail, then rebuilds the "Current Tee Sheet" tab.
 *
 * Matching: names attach to events by date + start time + event TYPE. For the
 * standard events the type is a coarse keyword (tee time / on-course lesson /
 * regular lesson); for private/standing events (no keyword) the full title is
 * the discriminator, so two different private blocks never pool. Title is read
 * from the line directly above each "North Hill Country Club" address line, so
 * a single booking can mix several event types (e.g. a lesson + a tee time).
 *
 * Cancellations: a seat is cancelled when its attendee line ends in "Cancelled"
 * (per-ticket), so partial cancellations leave the surviving dates intact.
 *
 * Private/standing events are shown as "Reserved" — their unbooked seats are
 * held for that group, not open to the league.
 *
 * DISPLAY WINDOW is rolling by default: today through today + LOOKAHEAD_DAYS.
 * Nothing here needs a yearly date edit. HIDE_BEFORE / HIDE_AFTER exist only as
 * temporary manual overrides — leave them as '' for normal operation.
 *
 * GMAIL COST: booking emails are parsed once and cached in a hidden sheet.
 * Each run reads only mail newer than the last successful pass, so a run costs
 * a handful of Gmail calls instead of one per thread. Run resetNameCache() to
 * force a full re-read from scratch.
 *
 * DEGRADED MODE: if Gmail is unavailable (quota, outage), the sheet is still
 * rebuilt — times and open spots come from Bookwhen and stay accurate, and the
 * last known player names are served from cache. The note row at the top tells
 * members the names may be behind, so a stale sheet never looks authoritative.
 *
 * Setup: token in Project Settings → Script Properties → BOOKWHEN_API_KEY.
 */

// ===========================================================================
// Config
// ===========================================================================

const WORKSHEET_NAME = 'Current Tee Sheet';
const LOOKAHEAD_DAYS = 60;            // how far ahead to show events (~2 months)
const PLAYER_COLUMNS = 6;
const HIDE_EMPTY_ROWS = false;        // true = hide slots with no booked names

// Manual overrides for the display window (yyyy-MM-dd). Leave BOTH as '' for
// normal rolling operation: today → today + LOOKAHEAD_DAYS. Only set these to
// pin the sheet to a fixed range, and clear them again afterwards.
const HIDE_BEFORE = '';
const HIDE_AFTER = '';

// Only run on schedule between these hours (24h, sheet timezone). Manual runs
// from the editor always execute regardless.
const SYNC_START_HOUR = 7;            // 7am
const SYNC_END_HOUR = 21;             // 9pm (inclusive)

// Minutes: 1, 5, 10, 15, or 30. 60+ runs hourly.
const TRIGGER_INTERVAL_MINUTES = 60;

// Which event kinds appear on the sheet. 'other' = private/standing groups.
const INCLUDED_KINDS = ['tee_time', 'lesson', 'other'];

// Standing/private groups are the same players every week, so list them here
// and the sheet shows their names automatically — no booking required. Keyed by
// a lowercase substring of the event title (first match wins). Any held spot
// without a name listed falls back to "Reserved".
// (Member names redacted in this public reference copy.)
const STANDING_ROSTERS = [
  { match: 'sisters twosome',   players: ['Player A', 'Player B'] },
  { match: 'standing twosome',  players: ['Player C', 'Player D'] },
  { match: 'standing foursome', players: ['Player E', 'Player F', 'Player G', 'Player H'] },
];

const COLUMN_HEADERS = [
  'Time', 'Event', 'Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6', 'Open', 'Need clubs?',
];

// Note row shown to members. Which one appears depends on whether names were
// refreshed this run.
const SHEET_NOTE_OK = 'Names fill in automatically as new bookings come through — check back for the latest.';
const SHEET_NOTE_STALE_PREFIX = 'Heads up: player names were last refreshed ';
const SHEET_NOTE_STALE_SUFFIX = ' and may be missing recent bookings. Times and open spots below are current.';
const SHEET_NOTE_NO_NAMES = 'Player names are still loading and may be incomplete right now. Times and open spots below are current.';

// ===========================================================================
// Entry points
// ===========================================================================

/**
 * @param {Object} [e] Trigger event. Present for time-driven runs, absent when
 *     run by hand from the editor — manual runs skip the sync-hours gate.
 */
function runSync(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const scheduled = !!(e && e.triggerUid);

  if (scheduled && !withinSyncWindow_(tz)) {
    Logger.log('Outside sync window (%s:00–%s:59), skipping.', SYNC_START_HOUR, SYNC_END_HOUR);
    return;
  }

  const today = new Date();
  const toDate = new Date(today.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const events = fetchBookwhenEvents_(today, toDate, tz);
  Logger.log('Bookwhen: %s events in window', events.length);

  // Never throws for Gmail problems — returns cached names plus a health flag.
  const nameResult = fetchBookingNames_(ss, today, tz);

  const rows = buildTeeSheet_(events, nameResult.records, tz);
  const built = buildGrid_(rows, new Date(), tz, nameResult);
  writeSheet_(ss, built);
  Logger.log('Sync complete: %s tee sheet rows (names healthy: %s)', rows.length, nameResult.healthy);

  if (events.length && !rows.length) {
    console.error('Bookwhen returned ' + events.length
      + ' events but 0 rows survived filters — check the display window.');
  }
}

function withinSyncWindow_(tz) {
  const hour = Number(Utilities.formatDate(new Date(), tz, 'H'));
  return hour >= SYNC_START_HOUR && hour <= SYNC_END_HOUR;
}

function setupHourlyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === 'runSync'; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });

  const builder = ScriptApp.newTrigger('runSync').timeBased();
  if (TRIGGER_INTERVAL_MINUTES >= 60) {
    builder.everyHours(Math.round(TRIGGER_INTERVAL_MINUTES / 60)).create();
  } else {
    builder.everyMinutes(TRIGGER_INTERVAL_MINUTES).create();
  }
  Logger.log('Trigger installed: runSync every %s minutes (active %s:00–%s:59).',
    TRIGGER_INTERVAL_MINUTES, SYNC_START_HOUR, SYNC_END_HOUR);
}

/** Wipe the parsed-email cache so the next run re-reads Gmail from scratch. */
function resetNameCache() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(CACHE_SHEET_NAME);
  if (sh) ss.deleteSheet(sh);
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(CACHE_CURSOR_PROP);
  props.deleteProperty(LAST_SUCCESS_PROP);
  Logger.log('Name cache cleared. Next run does a full %s-day backfill.', BACKFILL_DAYS);
}

// ===========================================================================
// Bookwhen adapter (isolated) — UrlFetchApp.
// ===========================================================================

const BOOKWHEN_API_BASE = 'https://api.bookwhen.com/v2';
const BOOKWHEN_PAGE_SIZE = 20;
const BOOKWHEN_MAX_PAGES = 50;

function fetchBookwhenEvents_(fromDate, toDate, tz) {
  const token = getBookwhenToken_();
  const headers = { Authorization: 'Basic ' + Utilities.base64Encode(token + ':') };
  const from = Utilities.formatDate(fromDate, tz, 'yyyyMMdd');
  const to = Utilities.formatDate(toDate, tz, 'yyyyMMdd');

  const events = [];
  for (let page = 0; page < BOOKWHEN_MAX_PAGES; page++) {
    const offset = page * BOOKWHEN_PAGE_SIZE;
    const url = BOOKWHEN_API_BASE + '/events'
      + '?filter%5Bfrom%5D=' + from
      + '&filter%5Bto%5D=' + to
      + '&page%5Boffset%5D=' + offset;

    const resp = UrlFetchApp.fetch(url, { headers: headers, muteHttpExceptions: true });
    const code = resp.getResponseCode();
    if (code !== 200) {
      throw new Error('Bookwhen API HTTP ' + code + ': ' + resp.getContentText().slice(0, 300));
    }
    const payload = JSON.parse(resp.getContentText());
    if (payload.errors) {
      throw new Error('Bookwhen API error: ' + JSON.stringify(payload.errors).slice(0, 300));
    }
    const data = payload.data || [];
    data.forEach(function (item) { events.push(parseBookwhenEvent_(item)); });
    if (data.length < BOOKWHEN_PAGE_SIZE) break;
  }

  const fromDay = Utilities.formatDate(fromDate, tz, 'yyyy-MM-dd');
  const active = events.filter(function (e) {
    return !e.cancelled && Utilities.formatDate(e.start, tz, 'yyyy-MM-dd') >= fromDay;
  });
  active.sort(function (a, b) { return a.start - b.start; });
  return active;
}

function parseBookwhenEvent_(item) {
  const a = item.attributes || {};
  let tags = a.tags || [];
  if (!Array.isArray(tags)) tags = [String(tags)];
  const title = a.title || '';
  const limit = (a.attendee_limit === null || a.attendee_limit === undefined)
    ? null : Number(a.attendee_limit);
  const count = Number(a.attendee_count || 0);

  return {
    id: item.id || '',
    title: title,
    start: new Date(a.start_at),
    end: a.end_at ? new Date(a.end_at) : null,
    attendeeCount: count,
    attendeeLimit: limit,
    openSpots: limit === null ? null : Math.max(limit - count, 0),
    tags: tags.map(String),
    cancelled: !!a.cancelled_at,
    kind: classifyKind_(title, tags.map(String)),
  };
}

/** Coarse kind for the INCLUDED_KINDS filter (what shows on the sheet at all). */
function classifyKind_(title, tags) {
  const hay = (title + ' ' + tags.join(' ')).toLowerCase();
  if (hay.indexOf('tee time') !== -1 || hay.indexOf('tee-time') !== -1) return 'tee_time';
  if (hay.indexOf('lesson') !== -1) return 'lesson';
  return 'other';
}

/**
 * Coarse event type used for matching. Substring-based so it survives
 * renames/emoji. Distinguishes the three keyword event types; everything else
 * (private/standing groups) falls through to 'other' and is split by title in
 * slotType_ below.
 */
function eventType_(title) {
  const t = String(title || '').toLowerCase();
  if (t.indexOf('tee time') !== -1 || t.indexOf('tee-time') !== -1) return 'tee_time';
  if (t.indexOf('on-course') !== -1 || t.indexOf('on course') !== -1) return 'oncourse_lesson';
  if (t.indexOf('lesson') !== -1) return 'lesson';
  return 'other';
}

/**
 * Slot discriminator. Known events use their coarse type; private/'other'
 * events use their full (normalized) title so two different private blocks at
 * the same time never pool together. Both the event side and the email side
 * call this, so the keys agree.
 */
function slotType_(title) {
  const t = eventType_(title);
  if (t !== 'other') return t;
  return 'other:' + cleanEventName_(title).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** A standing group's fixed weekly roster by event title; null if not listed. */
function standingRoster_(title) {
  const t = String(title || '').toLowerCase();
  for (let i = 0; i < STANDING_ROSTERS.length; i++) {
    if (t.indexOf(STANDING_ROSTERS[i].match) !== -1) return STANDING_ROSTERS[i].players.slice();
  }
  return null;
}

function getBookwhenToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('BOOKWHEN_API_KEY');
  if (!token) {
    throw new Error('BOOKWHEN_API_KEY is not set. Add it in Project Settings → Script Properties.');
  }
  return token;
}

// ===========================================================================
// Gmail adapter (isolated) — attendee names from Bookwhen booking emails.
//
// Cost control: each run searches only mail newer than the last successful
// pass, parses it, and merges into a cached record set stored on a hidden
// sheet. A steady-state run touches Gmail 2–3 times regardless of mailbox size.
//
// Failure handling: Gmail errors are caught here, not thrown. The caller gets
// the last known good records plus a health flag, so a quota day degrades to
// "names may be behind" instead of an empty sheet.
// ===========================================================================

const BOOKING_QUERY_BASE = 'from:mail@bookwhen.com (subject:"New booking" OR subject:cancelled)';
const BACKFILL_DAYS = 120;            // first run / after resetNameCache()
const OVERLAP_SECONDS = 3600;         // re-read the last hour so nothing slips through a run boundary
const MAX_THREADS = 500;              // GmailApp.search hard cap
const CACHE_SHEET_NAME = '__name_cache__';
const CACHE_CURSOR_PROP = 'LOTL_MAIL_CURSOR';
const LAST_SUCCESS_PROP = 'LOTL_LAST_MAIL_OK';
const CACHE_CELL_CHARS = 45000;       // under the 50k per-cell limit
const CACHE_KEEP_PAST_DAYS = 14;      // prune records for events older than this

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const REF_RE = /Booking:\s*([A-Z0-9]{4,})/i;   // matches "New booking: X" and "Booking: X has been cancelled"
const CLUBS_RE = /need to borrow clubs\?\s*(.+)/i;
const DATETIME_RE = /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*,?\s*(\d{1,2}):(\d{2})\s*(am|pm)/i;

/**
 * @return {{records: Array, healthy: boolean, lastOkEpoch: number, reason: string}}
 *     `healthy` false means the records came from cache and may be behind.
 *     `lastOkEpoch` is 0 if names have never been fetched successfully.
 */
function fetchBookingNames_(ss, today, tz) {
  const props = PropertiesService.getScriptProperties();
  const lastOk = Number(props.getProperty(LAST_SUCCESS_PROP) || 0);

  let cached = [];
  try {
    cached = readNameCache_(ss);
  } catch (err) {
    console.error('Name cache unreadable: ' + err.message);
  }

  try {
    const cursor = Number(props.getProperty(CACHE_CURSOR_PROP) || 0);
    let query;
    if (cursor && cached.length) {
      query = BOOKING_QUERY_BASE + ' after:' + Math.max(cursor - OVERLAP_SECONDS, 0);
    } else {
      query = BOOKING_QUERY_BASE + ' newer_than:' + BACKFILL_DAYS + 'd';
      Logger.log('No usable cache — doing a %s-day backfill.', BACKFILL_DAYS);
    }

    const started = Date.now();
    const threads = GmailApp.search(query, 0, MAX_THREADS);
    // One batched call for all messages instead of one call per thread. This is
    // the difference between ~1200 Gmail calls per run and ~2.
    const messageGroups = GmailApp.getMessagesForThreads(threads);

    const fresh = [];
    let messageCount = 0;
    messageGroups.forEach(function (msgs) {
      msgs.forEach(function (msg) {
        messageCount++;
        parseBookingEmail_(msg.getPlainBody(), today, tz)
          .forEach(function (n) { fresh.push(n); });
      });
    });

    Logger.log('Gmail: %s threads, %s messages, %s new records, %s cached, %s ms',
      threads.length, messageCount, fresh.length, cached.length, Date.now() - started);

    if (threads.length >= MAX_THREADS) {
      console.error('Gmail search hit the ' + MAX_THREADS
        + '-thread cap — some mail was not read.');
    }

    const merged = pruneRecords_(dedupeRecords_(cached.concat(fresh)), tz);
    writeNameCache_(ss, merged);

    const nowEpoch = Math.floor(Date.now() / 1000);
    props.setProperty(CACHE_CURSOR_PROP, String(nowEpoch));
    props.setProperty(LAST_SUCCESS_PROP, String(nowEpoch));

    return { records: merged, healthy: true, lastOkEpoch: nowEpoch, reason: '' };
  } catch (err) {
    // Loud on purpose: this used to log as Info and read like a healthy run.
    // The cursor is deliberately NOT advanced, so the next run retries the same
    // window and nothing is skipped.
    console.error('GMAIL FETCH FAILED — serving cached names: ' + err.message);
    Logger.log('GMAIL FETCH FAILED — serving %s cached records: %s', cached.length, err.message);
    return {
      records: pruneRecords_(cached, tz),
      healthy: false,
      lastOkEpoch: lastOk,
      reason: err.message,
    };
  }
}

/**
 * Collapse exact repeats from the overlap window. A booking and its later
 * cancellation differ in the `cancelled` flag, so both survive.
 */
function dedupeRecords_(records) {
  const seen = {};
  const out = [];
  records.forEach(function (r) {
    const key = r.slotKey + '|' + String(r.name).toLowerCase()
      + '|' + (r.cancelled ? 'c' : 'a') + '|' + (r.needsClubs || '');
    if (seen[key]) return;
    seen[key] = true;
    out.push(r);
  });
  return out;
}

/** Drop records for events well in the past so the cache stays bounded. */
function pruneRecords_(records, tz) {
  const floor = Utilities.formatDate(
    new Date(Date.now() - CACHE_KEEP_PAST_DAYS * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd');
  return records.filter(function (r) {
    return String(r.slotKey || '').slice(0, 10) >= floor;
  });
}

function readNameCache_(ss) {
  const sh = ss.getSheetByName(CACHE_SHEET_NAME);
  if (!sh || sh.getLastRow() < 1) return [];
  const json = sh.getRange(1, 1, sh.getLastRow(), 1).getValues()
    .map(function (row) { return row[0]; })
    .filter(function (v) { return v !== '' && v !== null; })
    .join('');
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Name cache corrupt, discarding: ' + err.message);
    return [];
  }
}

function writeNameCache_(ss, records) {
  let sh = ss.getSheetByName(CACHE_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CACHE_SHEET_NAME);
    sh.hideSheet();
  }
  sh.clear();
  const json = JSON.stringify(records);
  const chunks = [];
  for (let i = 0; i < json.length; i += CACHE_CELL_CHARS) {
    chunks.push([json.slice(i, i + CACHE_CELL_CHARS)]);
  }
  if (chunks.length) sh.getRange(1, 1, chunks.length, 1).setValues(chunks);
}

/** The venue address line; it always sits directly under an event title. */
function isLocationLine_(line) {
  return /north hill country club|merry ave/i.test(line);
}

/**
 * Parse one booking email into attendee records. The event title is the line
 * directly above each address line, so a booking can mix event types and span
 * multiple dates. A seat is cancelled when its attendee line ends in
 * "Cancelled" (per-ticket), so surviving dates in the same email are kept.
 */
function parseBookingEmail_(body, today, tz) {
  const refMatch = body.match(REF_RE);
  const ref = refMatch ? refMatch[1] : '';

  const results = [];
  let currentType = 'other';
  let currentSlotKey = null;
  let current = null;
  let prevLine = '';   // last non-empty line; the title sits right above the address

  body.split('\n').forEach(function (raw) {
    const line = raw.trim();
    if (!line) return;

    // Address line => the line above it is this block's event title.
    if (isLocationLine_(line)) {
      currentType = slotType_(prevLine);
      prevLine = line;
      return;
    }

    // Date/time line opens a new block under the current event type.
    const dt = parseEmailDateTime_(line, today);
    if (dt) {
      currentSlotKey = dt.key + ' | ' + currentType;
      current = null;
      prevLine = line;
      return;
    }

    if (currentSlotKey) {
      const emailMatch = line.match(EMAIL_RE);
      const clubsMatch = line.match(CLUBS_RE);

      if (emailMatch && line.toLowerCase().indexOf('booking contact') !== 0) {
        const name = line.slice(0, emailMatch.index).replace(/[,\s]+$/, '').trim();
        if (name) {
          const tail = line.slice(emailMatch.index + emailMatch[0].length);
          current = {
            name: name,
            slotKey: currentSlotKey,
            needsClubs: null,
            ref: ref,
            cancelled: /\bcancelled\b/i.test(tail),
          };
          results.push(current);
        }
      } else if (clubsMatch && current) {
        current.needsClubs = clubsMatch[1].trim();
      }
    }

    prevLine = line;
  });
  return results;
}

/** Parse "Mon 6 Jul, 3:40pm - 5:40pm"; infer the missing year. */
function parseEmailDateTime_(body, today) {
  const m = body.match(DATETIME_RE);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase().slice(0, 3)];
  let hour = Number(m[3]) % 12;
  const minute = Number(m[4]);
  if (m[5].toLowerCase() === 'pm') hour += 12;

  let year = today.getFullYear();
  const firstOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (new Date(year, month, day) < firstOfThisMonth) year += 1;

  const key = pad4_(year) + '-' + pad2_(month + 1) + '-' + pad2_(day)
    + ' ' + pad2_(hour) + ':' + pad2_(minute);
  return { key: key };
}

// ===========================================================================
// Transform + render
// ===========================================================================

const KIND_RANK = { tee_time: 0, lesson: 1 };   // 'other' falls through to 2

// A tee time holds four spots. Private/standing groups reserve some of them;
// any spots past the reservation stay open to the league.
const TEE_TIME_CAPACITY = 4;
const TEE_TIME_LABEL = 'Tee Time ⛳';

/**
 * The display window. Rolling by default, so this never needs a date edit —
 * the hardcoded HIDE_AFTER is what silently emptied the sheet in the past.
 */
function displayWindow_(tz) {
  const now = new Date();
  return {
    before: HIDE_BEFORE || Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
    after: HIDE_AFTER || Utilities.formatDate(
      new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000), tz, 'yyyy-MM-dd'),
  };
}

function buildTeeSheet_(events, names, tz) {
  // Subtract cancellations: a cancelled ticket is keyed on slot + attendee name,
  // so drop the matching active seat.
  const cancelled = {};
  names.forEach(function (n) {
    if (n.cancelled) cancelled[cancelKey_(n)] = true;
  });

  const namesBySlot = {};
  names.forEach(function (n) {
    if (n.cancelled) return;
    if (cancelled[cancelKey_(n)]) return;   // this seat was later cancelled
    (namesBySlot[n.slotKey] = namesBySlot[n.slotKey] || []).push(n);
  });

  const win = displayWindow_(tz);
  const included = events.filter(function (e) {
    if (INCLUDED_KINDS.indexOf(e.kind) === -1) return false;
    const day = Utilities.formatDate(e.start, tz, 'yyyy-MM-dd');
    if (day < win.before) return false;
    if (day > win.after) return false;
    return true;
  });
  Logger.log('Window %s → %s: %s of %s events included.',
    win.before, win.after, included.length, events.length);

  // Group events into display rows. A public tee time and any private/standing
  // groups at the same start time are one physical tee time, so they merge into
  // a single row; lessons stay on their own rows keyed by type.
  const order = [];
  const groups = {};
  included.forEach(function (e) {
    const key = rowKey_(e, tz);
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(e);
  });

  let rows = order.map(function (key) {
    return buildRow_(groups[key], namesBySlot, tz);
  });

  if (HIDE_EMPTY_ROWS) {
    rows = rows.filter(function (r) { return r.players.length > 0; });
  }

  rows.sort(function (a, b) {
    if (a.start - b.start !== 0) return a.start - b.start;
    return (KIND_RANK[a.kind] || 2) - (KIND_RANK[b.kind] || 2);
  });
  return rows;
}

/** Tee times + private/standing groups at the same minute share one row;
 *  lessons stay separate, keyed by type. */
function rowKey_(e, tz) {
  const stamp = Utilities.formatDate(e.start, tz, 'yyyy-MM-dd HH:mm');
  if (e.kind === 'tee_time' || e.kind === 'other') return stamp + ' | TEE';
  return stamp + ' | ' + slotType_(e.title);
}

/** Booked attendees for one event, matched by date + start + type. */
function matchedFor_(e, namesBySlot, tz) {
  const slotKey = Utilities.formatDate(e.start, tz, 'yyyy-MM-dd HH:mm')
    + ' | ' + slotType_(e.title);
  return dedupeByName_(namesBySlot[slotKey] || []);
}

/** Build one display row from a group of one-or-more events sharing a slot. */
function buildRow_(group, namesBySlot, tz) {
  const start = group.reduce(function (min, e) {
    return e.start < min ? e.start : min;
  }, group[0].start);

  const needsClubs = [];
  group.forEach(function (e) {
    matchedFor_(e, namesBySlot, tz).forEach(function (m) {
      if (isAffirmative_(m.needsClubs)) needsClubs.push(m.name);
    });
  });

  const isTee = group.some(function (e) {
    return e.kind === 'tee_time' || e.kind === 'other';
  });

  // Lesson row: single event, names then Open.
  if (!isTee) {
    const e = group[0];
    const players = matchedFor_(e, namesBySlot, tz).map(function (m) { return m.name; });
    return {
      start: start,
      entryName: cleanEventName_(e.title) || titleCase_(e.kind),
      kind: e.kind,
      players: players,
      cells: openPaddedCells_(players, e.openSpots),
      openText: formatOpenCount_(e.openSpots),
      needsClubs: needsClubs,
    };
  }

  // Tee time slot: private/reserved spots first, then the public ones.
  let reservedPlayers = [];
  let reservedHeld = 0;
  let publicPlayers = [];
  let publicOpen = 0;
  let hasPublic = false;

  group.forEach(function (e) {
    if (e.kind === 'other') {
      // Reserve exactly the hardcoded roster names — leftover spots stay Open.
      const roster = standingRoster_(e.title) || [];
      const held = Math.min(roster.length, TEE_TIME_CAPACITY);
      reservedPlayers = reservedPlayers.concat(roster.slice(0, held));
      reservedHeld += held;
    } else {
      const players = matchedFor_(e, namesBySlot, tz).map(function (m) { return m.name; });
      hasPublic = true;
      publicPlayers = publicPlayers.concat(players);
      if (e.openSpots !== null && e.openSpots !== undefined) publicOpen += e.openSpots;
    }
  });
  reservedHeld = Math.min(reservedHeld, TEE_TIME_CAPACITY);

  // Open count: public spots if there's a public event, otherwise whatever's
  // left of the four-spot tee time after the reservation.
  const openCount = hasPublic ? publicOpen : Math.max(TEE_TIME_CAPACITY - reservedHeld, 0);

  const cells = [];
  reservedPlayers.forEach(function (n) { if (cells.length < PLAYER_COLUMNS) cells.push(n); });
  //while (cells.length < reservedHeld && cells.length < PLAYER_COLUMNS) cells.push('Reserved');
  publicPlayers.forEach(function (n) { if (cells.length < PLAYER_COLUMNS) cells.push(n); });
  for (let i = 0; i < openCount && cells.length < PLAYER_COLUMNS; i++) cells.push('Open');
  while (cells.length < PLAYER_COLUMNS) cells.push('');

  return {
    start: start,
    entryName: TEE_TIME_LABEL,
    kind: 'tee_time',
    players: reservedPlayers.concat(publicPlayers),
    cells: cells,
    openText: openCount + ' open',
    needsClubs: needsClubs,
  };
}

/** Players, then "Open" up to capacity (lessons and standalone events). */
function openPaddedCells_(players, openSpots) {
  const cells = players.slice(0, PLAYER_COLUMNS);
  let target;
  if (openSpots !== null && openSpots !== undefined) {
    target = Math.min(players.length + openSpots, PLAYER_COLUMNS);
  } else {
    target = players.length ? PLAYER_COLUMNS : 0;
  }
  while (cells.length < target) cells.push('Open');
  while (cells.length < PLAYER_COLUMNS) cells.push('');
  return cells;
}

function formatOpenCount_(openSpots) {
  if (openSpots === null || openSpots === undefined) return '';
  return openSpots + ' open';
}

/**
 * The member-facing note. When names are fresh this is the usual friendly line;
 * when they came from cache it says so, with when they were last refreshed, so
 * a stale sheet never reads as authoritative.
 */
function noteForHealth_(nameResult, tz) {
  if (nameResult.healthy) return SHEET_NOTE_OK;
  if (!nameResult.lastOkEpoch) return SHEET_NOTE_NO_NAMES;
  const when = Utilities.formatDate(
    new Date(nameResult.lastOkEpoch * 1000), tz, 'EEEE, MMMM d \'at\' h:mm a');
  return SHEET_NOTE_STALE_PREFIX + when + SHEET_NOTE_STALE_SUFFIX;
}

function buildGrid_(rows, updatedAt, tz, nameResult) {
  const health = nameResult || { healthy: true, lastOkEpoch: 0 };
  const width = COLUMN_HEADERS.length;
  const values = [];
  const dateHeaderRows = [];
  const colHeaderRows = [];
  const dataRows = [];

  values.push(padRow_(['Current Tee Sheet'], width));
  values.push(padRow_(
    ['Last updated ' + Utilities.formatDate(updatedAt, tz, 'EEEE, MMMM d, yyyy · h:mm a')], width));
  values.push(padRow_([noteForHealth_(health, tz)], width));
  values.push(padRow_([], width));

  const built = {
    values: values,
    dateHeaderRows: dateHeaderRows,
    colHeaderRows: colHeaderRows,
    dataRows: dataRows,
    namesHealthy: !!health.healthy,
  };

  if (!rows.length) {
    values.push(padRow_(['No upcoming bookings found.'], width));
    return built;
  }

  let currentDay = '';
  rows.forEach(function (row) {
    const day = Utilities.formatDate(row.start, tz, 'EEEE, MMMM d, yyyy');
    if (day !== currentDay) {
      currentDay = day;
      values.push(padRow_([
        Utilities.formatDate(row.start, tz, 'EEEE'),
        Utilities.formatDate(row.start, tz, 'MMMM d, yyyy'),
      ], width));
      dateHeaderRows.push(values.length - 1);
      values.push(COLUMN_HEADERS.slice());
      colHeaderRows.push(values.length - 1);
    }
    values.push([
      Utilities.formatDate(row.start, tz, 'h:mm a'),
      row.entryName,
    ].concat(row.cells, [
      row.openText,
      row.needsClubs.join(', '),
    ]));
    dataRows.push(values.length - 1);
  });
  return built;
}

function writeSheet_(ss, built) {
  const grid = built.values;
  const sheet = freshSheet_(ss);
  if (!grid.length) return;

  const width = COLUMN_HEADERS.length;
  const values = grid.map(function (r) { return padRow_(r, width); });
  const numRows = values.length;
  sheet.getRange(1, 1, numRows, width).setValues(values);

  sheet.getRange(1, 1, numRows, width)
    .setFontFamily('Arial').setFontSize(10).setVerticalAlignment('middle');

  sheet.getRange(1, 1, 1, width)
    .setBackground('#0b6623').setFontColor('#ffffff')
    .setFontSize(15).setFontWeight('bold');
  sheet.getRange(2, 1, 1, width)
    .setFontColor('#6b6b6b').setFontStyle('italic');

  // Note row: usual soft amber when healthy, a warmer tone when names are
  // behind — noticeable to a member scanning the sheet, but not alarming.
  const noteRange = sheet.getRange(3, 1, 1, width);
  if (built.namesHealthy) {
    noteRange.setBackground('#fff3cd').setFontColor('#7a6000')
      .setFontStyle('italic').setFontWeight('normal');
  } else {
    noteRange.setBackground('#ffe0b2').setFontColor('#8a4b00')
      .setFontStyle('italic').setFontWeight('bold');
  }

  sheet.getRange(1, 2, 1, width - 1).clearContent();
  sheet.getRange(2, 2, 1, width - 1).clearContent();
  sheet.getRange(3, 2, 1, width - 1).clearContent();

  built.dateHeaderRows.forEach(function (idx) {
    sheet.getRange(idx + 1, 1, 1, width)
      .setBackground('#1f7a3d').setFontColor('#ffffff').setFontWeight('bold').setFontSize(12);
    sheet.getRange(idx + 1, 3, 1, width - 2).clearContent();
  });
  built.colHeaderRows.forEach(function (idx) {
    sheet.getRange(idx + 1, 1, 1, width).setBackground('#e8f0ea').setFontWeight('bold')
      .setBorder(true, true, true, true, true, true, '#bdbdbd', SpreadsheetApp.BorderStyle.SOLID);
  });
  built.dataRows.forEach(function (idx) {
    sheet.getRange(idx + 1, 1, 1, width)
      .setBorder(true, true, true, true, true, true, '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID);
  });

  [70, 175, 130, 130, 130, 130, 130, 130, 70, 130].forEach(function (w, idx) {
    sheet.setColumnWidth(idx + 1, w);
  });
  const openCol = COLUMN_HEADERS.indexOf('Open') + 1;
  sheet.getRange(1, openCol, numRows, 1).setHorizontalAlignment('center');

  try { sheet.setFrozenRows(3); } catch (err) { Logger.log('frozen rows skipped: %s', err.message); }
  try { sheet.setHiddenGridlines(true); } catch (err) { Logger.log('hide gridlines skipped: %s', err.message); }
  Logger.log('Sheet styled: %s rows written', numRows);
}

// ===========================================================================
// Helpers
// ===========================================================================

function cancelKey_(n) {
  return n.slotKey + '|' + String(n.name).toLowerCase();
}

function isAffirmative_(answer) {
  if (!answer) return false;
  return ['yes', 'y', 'true', '1', 'needs clubs'].indexOf(String(answer).trim().toLowerCase()) !== -1;
}

function titleCase_(s) {
  return String(s).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}

function freshSheet_(ss) {
  const TMP = '__tee_sheet_tmp__';
  const staleTmp = ss.getSheetByName(TMP);
  if (staleTmp) ss.deleteSheet(staleTmp);

  const fresh = ss.insertSheet(TMP, 0);
  const old = ss.getSheetByName(WORKSHEET_NAME);
  if (old) ss.deleteSheet(old);
  fresh.setName(WORKSHEET_NAME);
  return fresh;
}

/** Strip Bookwhen's "Copy N of: " duplicate-event prefix for a clean label. */
function cleanEventName_(title) {
  return String(title || '').replace(/^Copy\s+\d+\s+of:\s*/i, '').trim();
}

function dedupeByName_(records) {
  const seen = {};
  const out = [];
  records.forEach(function (r) {
    const key = String(r.name).toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(r);
  });
  return out;
}

function padRow_(cells, width) {
  const out = cells.slice();
  while (out.length < width) out.push('');
  return out;
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }
function pad4_(n) { return ('000' + n).slice(-4); }
