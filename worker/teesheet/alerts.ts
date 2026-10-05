// Sync alerts: after each cron run, turn the tee sheet's health into
// notifications. Josh gets an email; a GitHub issue mentioning @claude hands
// the same problem to the repo's Claude agent.
//
// Privacy contract: the repo is public, so issue text never carries member
// names or email subjects. Problems have a `summary` that is safe anywhere and
// an optional `privateDetail` that only ever goes into the email.
import type { D1Database } from '@cloudflare/workers-types';
import type { TeeSheet } from './query.ts';

export interface Problem {
  /** Stable while the same problem persists; a new key is a new alert. */
  key: string;
  summary: string;
  privateDetail?: string;
}

interface Tracked {
  firstSeen: string;
  summary: string;
  notifiedAt?: string;
  issue?: number;
}
export type AlertState = Record<string, Tracked>;

export interface AlertPlan {
  /** Problems seen on two runs in a row and not yet announced. */
  fresh: Problem[];
  /** Announced problems still present a day later. */
  reminders: Problem[];
  /** Announced problems that have cleared. */
  resolved: { key: string; summary: string; issue?: number }[];
  state: AlertState;
}

/** One cron interval, less slack: a problem must survive to the next run before anyone is told. */
const CONFIRM_MS = 14 * 60 * 1000;
const REMIND_MS = 24 * 60 * 60 * 1000;
const STUCK_MS = 45 * 60 * 1000;
const RECENT_MS = 24 * 60 * 60 * 1000;
const STATE_KEY = 'alert_state';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The same conditions the health line on /tee-sheet reports. */
export function detectProblems(sheet: TeeSheet, now: Date): Problem[] {
  const h = sheet.health;
  const out: Problem[] = [];
  const age = (iso: string | null) => (iso ? now.getTime() - new Date(iso).getTime() : Infinity);

  if (h.apiLastError) {
    out.push({ key: 'api-failing', summary: `The Bookwhen events refresh is failing: ${h.apiLastError}` });
  } else if (!h.apiLastOkAt) {
    out.push({ key: 'api-never', summary: 'The Bookwhen events refresh has never succeeded.' });
  } else if (age(h.apiLastOkAt) > STUCK_MS) {
    out.push({ key: 'api-stuck', summary: `The Bookwhen events refresh last succeeded at ${h.apiLastOkAt} and may be stuck.` });
  }
  if (h.emailLastError && age(h.emailLastErrorAt) < RECENT_MS) {
    out.push({
      key: `email-storage:${h.emailLastErrorAt}`,
      summary: `A booking email could not be stored: ${h.emailLastError}`,
    });
  }
  if (h.unparsedCount > 0 && age(h.unparsedLatestAt) < RECENT_MS) {
    out.push({
      key: `unparsed:${h.unparsedLatestAt}`,
      summary: `A Bookwhen email could not be read (${plural(h.unparsedCount, 'unreadable email', 'unreadable emails')} in the last 30 days), so a booking may be missing from the tee sheet.`,
      privateDetail: h.unparsedLatestSubject ? `Latest subject: ${h.unparsedLatestSubject}` : undefined,
    });
  }
  for (const s of sheet.slots) {
    if (!s.countMismatch) continue;
    out.push({
      key: `mismatch:${s.slotKey}`,
      summary: `"${s.title}" on ${s.date} at ${s.time}: Bookwhen reports ${s.attendeeCount ?? 0} booked, the tee sheet lists ${plural(s.players.length, 'name', 'names')}.`,
    });
  }
  // Names hidden because Bookwhen no longer lists their event are not a problem:
  // organizers cancel events, and the sheet only shows events Bookwhen has. A
  // booking email whose title was misread shows up as a count mismatch instead.
  return out;
}

/** Pure: decide what to announce given what was already tracked. */
export function planAlerts(prev: AlertState, problems: Problem[], now: Date): AlertPlan {
  const t = now.getTime();
  const iso = now.toISOString();
  const state: AlertState = {};
  const fresh: Problem[] = [];
  const reminders: Problem[] = [];

  for (const p of problems) {
    const was = prev[p.key];
    const entry: Tracked = was ? { ...was, summary: p.summary } : { firstSeen: iso, summary: p.summary };
    if (!entry.notifiedAt) {
      if (t - new Date(entry.firstSeen).getTime() >= CONFIRM_MS) fresh.push(p);
    } else if (t - new Date(entry.notifiedAt).getTime() >= REMIND_MS) {
      reminders.push(p);
    }
    state[p.key] = entry;
  }
  const resolved = Object.entries(prev)
    .filter(([key, was]) => !(key in state) && was.notifiedAt)
    .map(([key, was]) => ({ key, summary: was.summary, issue: was.issue }));
  return { fresh, reminders, resolved, state };
}

export interface AlertConfig {
  resendKey?: string;
  /** Where alert emails go. Unset: no email. */
  alertEmail?: string;
  /** Token allowed to open issues on `repo`. Unset: no issue. */
  githubToken?: string;
  /** "owner/name". */
  repo?: string;
  fetch: typeof fetch;
}

const FROM = 'Ladies on the Links Sync <stories@ladiesonthelinksgolf.com>';
const SHEET_URL = 'https://ladiesonthelinksgolf.com/tee-sheet';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendEmail(cfg: AlertConfig, subject: string, html: string): Promise<void> {
  if (!cfg.resendKey || !cfg.alertEmail) return;
  const res = await cfg.fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.resendKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [cfg.alertEmail], subject, html }),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
}

async function github(cfg: AlertConfig, method: string, path: string, body: unknown): Promise<any> {
  const res = await cfg.fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${cfg.githubToken}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'lotl-site-sync-alerts',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
  return res.json();
}

export function issueBody(problems: Problem[]): string {
  return `@claude the tee sheet sync reported a problem that survived two runs in a row.

${problems.map((p) => `- ${p.summary}`).join('\n')}

Please investigate the sync code (\`worker/teesheet/\`: \`parse.ts\` reads Bookwhen emails, \`bookwhen.ts\` pulls events, \`query.ts\` joins them and flags drift). Follow the "Sync alert issues" section of CLAUDE.md: check the production data read-only first, fix a code bug with a test that reproduces it, repair data only when the cause is clear, and if it needs an organizer's decision or a Bookwhen change, say exactly what Josh should check and leave the issue open.

Opened automatically by the sync cron. Live status: ${SHEET_URL}`;
}

/**
 * Detect, plan, notify, persist. Never throws: a broken alert channel must not
 * fail the cron, and the state is only advanced for channels that worked.
 */
export async function runAlerts(db: D1Database, sheet: TeeSheet, cfg: AlertConfig, now: Date): Promise<AlertPlan | null> {
  try {
    const row = await db.prepare('SELECT value FROM sync_state WHERE key = ?').bind(STATE_KEY).first<{ value: string }>();
    const prev: AlertState = row ? JSON.parse(row.value) : {};
    const plan = planAlerts(prev, detectProblems(sheet, now), now);
    const iso = now.toISOString();
    const list = (ps: Problem[], withPrivate: boolean) =>
      `<ul>${ps.map((p) => `<li>${esc(p.summary)}${withPrivate && p.privateDetail ? `<br><em>${esc(p.privateDetail)}</em>` : ''}</li>`).join('')}</ul>`;

    if (plan.fresh.length > 0) {
      let issue: { number: number; html_url: string } | null = null;
      if (cfg.githubToken && cfg.repo) {
        try {
          issue = await github(cfg, 'POST', '/issues', {
            title: `Tee sheet sync: ${plan.fresh.length === 1 ? plan.fresh[0].summary.slice(0, 90) : `${plan.fresh.length} problems`}`,
            body: issueBody(plan.fresh),
          });
        } catch (err) {
          console.log(JSON.stringify({ event: 'alert-issue-failed', error: String(err) }));
        }
      }
      let delivered = issue !== null;
      try {
        await sendEmail(
          cfg,
          `Tee sheet sync needs attention (${plural(plan.fresh.length, 'problem', 'problems')})`,
          `<p>The tee sheet sync found something that did not clear on its own:</p>${list(plan.fresh, true)}` +
            (issue ? `<p>A Claude agent is looking at it: <a href="${issue.html_url}">${issue.html_url}</a></p>` : '') +
            `<p><a href="${SHEET_URL}">Open the tee sheet</a></p>`
        );
        delivered = delivered || Boolean(cfg.resendKey && cfg.alertEmail);
      } catch (err) {
        console.log(JSON.stringify({ event: 'alert-email-failed', error: String(err) }));
      }
      // Undelivered problems stay un-notified, so the next run tries again.
      if (delivered) {
        for (const p of plan.fresh) {
          plan.state[p.key].notifiedAt = iso;
          if (issue) plan.state[p.key].issue = issue.number;
        }
      }
    }

    if (plan.reminders.length > 0) {
      try {
        await sendEmail(
          cfg,
          `Tee sheet sync: still not fixed (${plural(plan.reminders.length, 'problem', 'problems')})`,
          `<p>Still happening a day later:</p>${list(plan.reminders, true)}<p><a href="${SHEET_URL}">Open the tee sheet</a></p>`
        );
        for (const p of plan.reminders) plan.state[p.key].notifiedAt = iso;
      } catch (err) {
        console.log(JSON.stringify({ event: 'alert-email-failed', error: String(err) }));
      }
    }

    if (plan.resolved.length > 0) {
      try {
        await sendEmail(
          cfg,
          'Tee sheet sync: cleared',
          `<p>No longer happening:</p><ul>${plan.resolved.map((r) => `<li>${esc(r.summary)}</li>`).join('')}</ul>`
        );
      } catch (err) {
        console.log(JSON.stringify({ event: 'alert-email-failed', error: String(err) }));
      }
      if (cfg.githubToken && cfg.repo) {
        const stillOpen = new Set(Object.values(plan.state).map((s) => s.issue));
        const issues = new Set(plan.resolved.map((r) => r.issue).filter((n): n is number => typeof n === 'number'));
        for (const n of issues) {
          try {
            const mine = plan.resolved.filter((r) => r.issue === n);
            await github(cfg, 'POST', `/issues/${n}/comments`, {
              body: `The sync no longer reports:\n\n${mine.map((r) => `- ${r.summary}`).join('\n')}`,
            });
            if (!stillOpen.has(n)) await github(cfg, 'PATCH', `/issues/${n}`, { state: 'closed' });
          } catch (err) {
            console.log(JSON.stringify({ event: 'alert-issue-failed', error: String(err) }));
          }
        }
      }
    }

    await db
      .prepare(
        `INSERT INTO sync_state (key, value, updated_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .bind(STATE_KEY, JSON.stringify(plan.state), iso)
      .run();
    return plan;
  } catch (err) {
    console.log(JSON.stringify({ event: 'alerts-failed', error: String(err) }));
    return null;
  }
}
