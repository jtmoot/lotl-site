// Add a photo to the site the safe way: auto-rotate, downsize, strip EXIF/GPS.
//
//   node scripts/add-photo.mjs <source> <dest-under-src/assets/photos> [max-width]
//   node scripts/add-photo.mjs /tmp/github-images/image-1.jpg gallery/league-12.jpg
//
// Source photos (phone exports, GitHub issue attachments) carry GPS metadata;
// this is the only sanctioned way to commit an image. Astro's own sharp
// dependency is reused, so no extra install is needed.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const [, , source, dest, widthArg] = process.argv;
if (!source || !dest) {
  console.error('usage: node scripts/add-photo.mjs <source> <dest-under-src/assets/photos> [max-width]');
  process.exit(1);
}
if (dest.includes('..') || path.isAbsolute(dest)) {
  console.error('dest must be a relative path under src/assets/photos, e.g. gallery/league-12.jpg');
  process.exit(1);
}
const maxWidth = Number(widthArg ?? 1600);
const out = path.join('src/assets/photos', dest.replace(/\.(jpe?g|png|heic|webp)$/i, '.jpg'));
await mkdir(path.dirname(out), { recursive: true });
const info = await sharp(source)
  .rotate()
  .resize({ width: maxWidth, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out);
console.log(`${out} ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB (EXIF stripped)`);
