import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Tailwind v4 is wired through PostCSS (postcss.config.mjs) rather than the Vite
// plugin, for Astro 6 / rolldown-vite compatibility.
// https://astro.build/config
export default defineConfig({
  site: 'https://ladiesonthelinksgolf.com',
  integrations: [
    sitemap({
      // The only non-indexed route is /privacy (built in #11); exclude it from the sitemap.
      filter: (page) => !page.includes('/privacy'),
    }),
  ],
});
