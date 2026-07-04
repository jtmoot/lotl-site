// Pure logic for the story-notes Worker: input validation and signed
// delete-link tokens. No I/O here — everything is unit-testable.

export interface CommentInput {
  name?: unknown;
  email?: unknown;
  body?: unknown;
  /** Honeypot field: humans never see it, bots love to fill it. */
  website?: unknown;
}

export type ValidationResult =
  | { ok: true; value: { name: string; email: string | null; body: string } }
  | { ok: false; error: string; spam?: true };

export const NAME_MAX = 80;
export const BODY_MAX = 2000;

export function validateComment(input: CommentInput): ValidationResult {
  // Honeypot: silently treated as spam upstream (the bot gets a 200).
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, error: 'spam', spam: true };
  }

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';

  if (!name) return { ok: false, error: 'Please add your name.' };
  if (name.length > NAME_MAX) return { ok: false, error: 'That name is a little long.' };
  if (!body) return { ok: false, error: 'Please write a note first.' };
  if (body.length > BODY_MAX) return { ok: false, error: `Notes max out at ${BODY_MAX} characters.` };

  return { ok: true, value: { name, email: email || null, body } };
}

// --- Signed delete links -------------------------------------------------
// The notification email carries GET /api/comments/:id/delete?sig=<hmac>.
// HMAC-SHA256 over the comment id means only someone holding the emailed
// link can delete, with no login or session anywhere.

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signDeleteToken(commentId: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`delete:${commentId}`));
  return toHex(sig);
}

export async function verifyDeleteToken(
  commentId: string,
  sig: string,
  secret: string
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = await signDeleteToken(commentId, secret);
  // Constant-time-ish compare; timing is a non-issue at this scale but free.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
