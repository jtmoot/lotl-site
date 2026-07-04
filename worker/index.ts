// Story-notes API: likes + comments for /stories/<slug>, backed by D1.
// Only /api/* reaches this Worker (run_worker_first); everything else is
// served as static assets by the platform.

// Workers types are imported (not globally referenced) so they can't clash
// with the DOM lib used by the Astro pages in the same TS program.
import type { D1Database, Fetcher, ExecutionContext } from '@cloudflare/workers-types';
import { validateComment, signDeleteToken, verifyDeleteToken } from './lib';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TURNSTILE_SECRET: string;
  RESEND_API_KEY: string;
  DELETE_LINK_SECRET: string;
}

const NOTIFY_TO = 'help@ladiesonthelinksgolf.com';
const NOTIFY_FROM = 'Ladies on the Links Stories <stories@ladiesonthelinksgolf.com>';

interface CommentRow {
  id: string;
  name: string;
  body: string;
  created_at: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A slug is real iff the built site has a page for it. */
async function storyExists(env: Env, slug: string, origin: string): Promise<boolean> {
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return false;
  const res = await env.ASSETS.fetch(`${origin}/stories/${slug}/`);
  return res.ok;
}

async function getStoryData(env: Env, slug: string): Promise<Response> {
  const likeRow = await env.DB.prepare('SELECT count FROM likes WHERE slug = ?')
    .bind(slug)
    .first<{ count: number }>();
  const { results } = await env.DB.prepare(
    'SELECT id, name, body, created_at FROM comments WHERE slug = ? ORDER BY created_at ASC'
  )
    .bind(slug)
    .all<CommentRow>();
  return json({ likes: likeRow?.count ?? 0, comments: results });
}

async function verifyTurnstile(env: Env, token: string, ip: string | null): Promise<boolean> {
  if (!token) return false;
  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET);
  form.set('response', token);
  if (ip) form.set('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    // Turnstile outage shouldn't brick the league's comment box.
    return true;
  }
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${ip}`)
  );
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Fire-and-forget notification; a failed email must never fail the comment. */
async function sendNotification(
  env: Env,
  origin: string,
  comment: { id: string; slug: string; name: string; email: string | null; body: string }
): Promise<void> {
  try {
    const sig = await signDeleteToken(comment.id, env.DELETE_LINK_SECRET);
    const deleteUrl = `${origin}/api/comments/${comment.id}/delete?sig=${sig}`;
    const storyUrl = `${origin}/stories/${comment.slug}`;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        reply_to: comment.email ?? undefined,
        subject: `New note from ${comment.name} on "${comment.slug}"`,
        html: `<p><strong>${escapeHtml(comment.name)}</strong> left a note on <a href="${storyUrl}">${comment.slug}</a>:</p>
<blockquote>${escapeHtml(comment.body)}</blockquote>
<p>It is already live on the site. If it doesn't belong there:</p>
<p><a href="${deleteUrl}">Delete this note</a> (one click, no login)</p>`,
      }),
    });
  } catch {
    // Swallow: notification is best-effort by design.
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Anything that isn't the API belongs to the static site — including its
    // 404 page (see assets.not_found_handling in wrangler.jsonc). The cast
    // bridges workers-types' Request/Response and the DOM lib's.
    if (!url.pathname.startsWith('/api/')) {
      return (env.ASSETS as unknown as { fetch: typeof fetch }).fetch(request);
    }

    const storyMatch = url.pathname.match(/^\/api\/stories\/([^/]+)$/);
    if (storyMatch && request.method === 'GET') {
      const slug = storyMatch[1];
      if (!(await storyExists(env, slug, url.origin))) return json({ error: 'not found' }, 404);
      return getStoryData(env, slug);
    }

    const likeMatch = url.pathname.match(/^\/api\/stories\/([^/]+)\/like$/);
    if (likeMatch && request.method === 'POST') {
      const slug = likeMatch[1];
      if (!(await storyExists(env, slug, url.origin))) return json({ error: 'not found' }, 404);
      const row = await env.DB.prepare(
        `INSERT INTO likes (slug, count) VALUES (?, 1)
         ON CONFLICT(slug) DO UPDATE SET count = count + 1
         RETURNING count`
      )
        .bind(slug)
        .first<{ count: number }>();
      return json({ likes: row?.count ?? 1 });
    }

    const commentMatch = url.pathname.match(/^\/api\/stories\/([^/]+)\/comments$/);
    if (commentMatch && request.method === 'POST') {
      const slug = commentMatch[1];
      if (!(await storyExists(env, slug, url.origin))) return json({ error: 'not found' }, 404);

      let payload: Record<string, unknown>;
      try {
        payload = await request.json();
      } catch {
        return json({ error: 'Bad request.' }, 400);
      }

      const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
      const token = typeof payload['cf-turnstile-response'] === 'string'
        ? (payload['cf-turnstile-response'] as string)
        : '';
      if (!(await verifyTurnstile(env, token, ip))) {
        return json({ error: 'Could not verify you are human — please try again.' }, 403);
      }

      const validated = validateComment(payload);
      if (!validated.ok) {
        // Honeypotted bots get a cheerful 200 and nothing is stored.
        if (validated.spam) return json({ ok: true });
        return json({ error: validated.error }, 400);
      }

      const ipHash = await hashIp(ip, env.DELETE_LINK_SECRET);
      const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM comments WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-60 seconds')"
      )
        .bind(ipHash)
        .first<{ n: number }>();
      if ((recent?.n ?? 0) >= 3) {
        return json({ error: 'Easy there — give it a minute before your next note.' }, 429);
      }

      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO comments (id, slug, name, email, body, ip_hash) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(id, slug, validated.value.name, validated.value.email, validated.value.body, ipHash)
        .run();

      ctx.waitUntil(sendNotification(env, url.origin, { id, slug, ...validated.value }));
      return json({ ok: true }, 201);
    }

    if (url.pathname === '/api/likes' && request.method === 'GET') {
      const slugs = (url.searchParams.get('slugs') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^[a-z0-9-]{1,100}$/.test(s))
        .slice(0, 50);
      const counts: Record<string, number> = Object.fromEntries(slugs.map((s) => [s, 0]));
      if (slugs.length > 0) {
        const placeholders = slugs.map(() => '?').join(',');
        const { results } = await env.DB.prepare(
          `SELECT slug, count FROM likes WHERE slug IN (${placeholders})`
        )
          .bind(...slugs)
          .all<{ slug: string; count: number }>();
        for (const row of results) counts[row.slug] = row.count;
      }
      return json(counts);
    }

    const deleteMatch = url.pathname.match(/^\/api\/comments\/([0-9a-f-]+)\/delete$/);
    if (deleteMatch && request.method === 'GET') {
      const id = deleteMatch[1];
      const sig = url.searchParams.get('sig') ?? '';
      if (!(await verifyDeleteToken(id, sig, env.DELETE_LINK_SECRET))) {
        return new Response('This delete link is not valid.', { status: 403 });
      }
      // Idempotent: re-clicked email links land on the same calm page.
      await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
      return new Response(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Note removed</title></head>
<body style="font-family: Georgia, serif; background:#f6efdf; color:#1c1c22; display:grid; place-items:center; min-height:100vh; margin:0;">
<main style="text-align:center; padding:2rem;">
<h1 style="color:#1a4a33; font-weight:300;">Note removed</h1>
<p>That note is no longer on the site. Nothing else to do.</p>
</main></body></html>`,
        { status: 200, headers: { 'content-type': 'text/html;charset=utf-8' } }
      );
    }

    return json({ error: 'not found' }, 404);
  },
};
