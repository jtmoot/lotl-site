import { z } from 'astro/zod';

/**
 * Shared content schemas.
 *
 * These live in a plain module (not content.config.ts) so the build AND the
 * node test runner can import the exact same zod schema. This is the highest
 * priority test seam: a malformed content entry must be rejected here, which
 * is what makes a bad gallery/blog edit fail the build instead of breaking the
 * live site. The real gallery (#7) and stories (#12) collections extend this
 * pattern; `noteSchema` is the foundation sample that proves the seam.
 */
export const noteSchema = z.object({
  title: z.string().min(1),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
});

export type Note = z.infer<typeof noteSchema>;
