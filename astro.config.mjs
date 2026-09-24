import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Tailwind v4 is wired through PostCSS (postcss.config.mjs) rather than the Vite
// plugin, for Astro 6 / rolldown-vite compatibility.
// https://astro.build/config
export default defineConfig({
  site: 'https://ladiesonthelinksgolf.com',
  // Nav consolidation (2026-07): Stories + Gallery merged into /league-life,
  // FAQ merged into /contact. Static output emits meta-refresh pages for these,
  // so old links and bookmarks keep working. /stories/<slug> posts are NOT
  // redirected; only the old index URLs are.
  redirects: {
    '/stories': '/league-life',
    '/gallery': '/league-life',
    '/faq': '/contact',
  },
  integrations: [
    sitemap({
      // Non-indexed routes: /privacy and the members-only-by-link /tee-sheet.
      filter: (page) => !page.includes('/privacy') && !page.includes('/tee-sheet'),
    }),
  ],
});
