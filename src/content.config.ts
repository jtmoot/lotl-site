import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { noteSchema } from './content/schemas';

// Foundation sample collection. It exists to wire the schema seam end-to-end:
// a malformed entry here fails `astro build`. Real collections (gallery #7,
// stories #12) follow this same shape.
const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.md' }),
  schema: noteSchema,
});

export const collections = { notes };
