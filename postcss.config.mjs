// Tailwind v4 via PostCSS. Used instead of the Vite plugin because Astro 6's
// rolldown-based Vite isn't yet compatible with @tailwindcss/vite.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
