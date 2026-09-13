#!/usr/bin/env node
/**
 * Downloads the photograph set for self-hosting.
 *
 * Hotlinking Wikimedia is fine for a handful of developers and rude at any real
 * traffic volume. This mirrors every photo in `src/data/photos.ts` into a
 * directory, named by its key, so you can put the set behind your own CDN and
 * point the app at it with EXPO_PUBLIC_PHOTO_BASE_URL.
 *
 *   node scripts/mirror-photos.mjs public/photos
 *
 * An ATTRIBUTION.txt is written alongside, because every one of these images
 * carries a licence that requires crediting the photographer, and a mirror that
 * drops the credit is a licence breach.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(process.cwd(), process.argv[2] ?? 'public/photos');

/**
 * Reads the generated table without importing it: photos.ts is TypeScript and
 * this script has to run in plain Node.
 */
function readPhotos() {
  const source = readFileSync(resolve(here, '..', 'src', 'data', 'photos.ts'), 'utf8');
  const match = source.match(/export const PHOTOS: Record<string, Photo> = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('Could not find PHOTOS in src/data/photos.ts');
  return JSON.parse(match[1]);
}

const photos = readPhotos();
mkdirSync(target, { recursive: true });

const attribution = [
  'Photographs in this directory come from Wikimedia Commons.',
  'Each is reused under the licence named below, which requires that the',
  'photographer stays credited wherever the image is shown.',
  '',
];

let ok = 0;
let failed = 0;

for (const [key, item] of Object.entries(photos)) {
  try {
    const response = await fetch(item.url, { headers: { 'user-agent': 'SafarRail/1.0 (photo mirror)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const bytes = Buffer.from(await response.arrayBuffer());
    writeFileSync(resolve(target, `${key}.jpg`), bytes);

    attribution.push(`${key}.jpg`);
    attribution.push(`  ${item.title}`);
    attribution.push(`  ${item.author} - ${item.licence}`);
    attribution.push(`  ${item.source}`);
    attribution.push('');

    ok += 1;
    console.log(`ok   ${key.padEnd(24)} ${(bytes.length / 1024).toFixed(0)} KB`);
  } catch (error) {
    failed += 1;
    console.log(`--   ${key.padEnd(24)} ${error instanceof Error ? error.message : 'failed'}`);
  }
}

writeFileSync(resolve(target, 'ATTRIBUTION.txt'), attribution.join('\n'));
console.log(`\n${ok} mirrored, ${failed} failed -> ${target}`);
console.log('Set EXPO_PUBLIC_PHOTO_BASE_URL to wherever you serve this directory.');
