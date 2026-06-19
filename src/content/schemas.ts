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

/**
 * Gallery entry: the first real collection built on the seam above.
 *
 * The non-image fields live in `galleryFields` so the build collection
 * (`src/content.config.ts`) and this plain test-importable schema share one
 * source of truth. The build collection swaps the string `images` validator
 * below for Astro's `image()` helper, which additionally fails the build on a
 * bad image reference. `image()` only exists inside the Astro content context,
 * so this string mirror is what the node schema tests parse against.
 *
 * Anonymous at launch: no member-name or attribution field exists by design.
 */
export const galleryFields = {
  /** Optional alt text; the page falls back to a generic course description. */
  alt: z.string().min(1).optional(),
  /** Optional event/date grouping label, e.g. "North Hill Country Club". */
  event: z.string().min(1).optional(),
  /** Optional date for grouping/sorting. */
  date: z.coerce.date().optional(),
  draft: z.boolean().default(false),
};

export const galleryEntrySchema = z.object({
  images: z.array(z.string().min(1)).min(1, 'a gallery entry needs at least one image'),
  ...galleryFields,
});

export type GalleryEntry = z.infer<typeof galleryEntrySchema>;

/**
 * Story entry: the dated, indexed Stories/Blog archive.
 *
 * Same seam as the gallery: the non-cover fields live in `storyFields` so the
 * build collection (`src/content.config.ts`) and this node-importable schema
 * share one source of truth. The build collection swaps the string `cover`
 * validator below for Astro's `image()` helper, which additionally fails the
 * build on a bad cover reference. `image()` only exists inside the Astro content
 * context, so this string mirror is what the node schema tests parse against.
 *
 * Unlike the anonymous gallery, stories are attributed (author + date). Member
 * spotlights set the optional `attribution` field, which carries a FIRST NAME
 * ONLY under the consent model (opt-in, takedown on request).
 */
export const storyFields = {
  /** Display title; also the page <h1>. */
  title: z.string().min(1),
  /** Publish date; sorts the index newest-first. */
  date: z.coerce.date(),
  /** Byline, e.g. "Ladies on the Links", "Stacey", or "Christian Grace". */
  author: z.string().min(1),
  /** Optional spotlighted member, FIRST NAME ONLY, opt-in. */
  attribution: z.string().min(1).optional(),
  draft: z.boolean().default(false),
};

export const storyEntrySchema = z.object({
  cover: z.string().min(1),
  ...storyFields,
});

export type Story = z.infer<typeof storyEntrySchema>;
