import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { noteSchema, galleryFields, storyFields } from './content/schemas';

// Foundation sample collection. It exists to wire the schema seam end-to-end:
// a malformed entry here fails `astro build`. Real collections (gallery #7,
// stories #12) follow this same shape.
const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.md' }),
  schema: noteSchema,
});

// Gallery: one Markdown file per entry, an anonymous photo grid at launch.
// `image()` resolves each path to an optimized ImageMetadata (build-time
// responsive variants) AND fails the build on a missing/bad image reference.
// The non-image fields mirror `galleryEntrySchema` in ./content/schemas, which
// the node schema tests parse against (image() is Astro-context-only).
const gallery = defineCollection({
  loader: glob({ base: './src/content/gallery', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      images: z.array(image()).min(1, 'a gallery entry needs at least one image'),
      ...galleryFields,
    }),
});

// Stories: the dated, indexed blog. One Markdown file per post; `image()`
// resolves the cover to an optimized ImageMetadata AND fails the build on a
// missing/bad cover reference. The non-cover fields mirror `storyEntrySchema`
// in ./content/schemas, which the node schema tests parse against.
const stories = defineCollection({
  loader: glob({ base: './src/content/stories', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      cover: image(),
      ...storyFields,
    }),
});

export const collections = { notes, gallery, stories };
