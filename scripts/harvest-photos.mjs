#!/usr/bin/env node
/**
 * Harvests real, freely-licensed photography from Wikimedia Commons.
 *
 * An app about Pakistan should show Pakistan. Rather than shipping generic
 * stock or AI-generated filler, this pulls actual photographs of the stations,
 * trains and cities on the network, records each one's licence and author, and
 * writes them into `src/data/photos.ts` with the attribution intact.
 *
 * Re-run with `npm run photos`.
 *
 * Two rules keep the output honest, both learned the hard way: a keyword search
 * for "Green Line" returns a London bus, and one for "Peshawar station" returns
 * an aeroplane. So every candidate must (a) prove it is about Pakistan and
 * (b) prove it is about *this* subject, or it is rejected. A key with no match
 * is left out entirely and falls back to a sibling at runtime, because a
 * missing photo is recoverable and a wrong one is embarrassing.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, '..', 'src', 'data', 'photos.ts');
const API = 'https://commons.wikimedia.org/w/api.php';

/**
 * key, search terms (in order of preference), and the token the winning file
 * must actually mention. `pk: false` exempts a subject from the Pakistan check.
 */
const SUBJECTS = [
  // --- Destinations -------------------------------------------------------
  ['city.karachi', ['Clifton Beach Karachi', 'Karachi skyline', 'Mazar-e-Quaid'], /karachi|clifton|quaid/i],
  ['city.lahore', ['Badshahi Mosque', 'Lahore Fort', 'Minar-e-Pakistan'], /lahore|badshahi|minar/i],
  ['city.islamabad', ['Faisal Mosque', 'Margalla Hills Islamabad', 'Islamabad skyline'], /islamabad|faisal mosque|margalla/i],
  ['city.rawalpindi', ['Rawalpindi city', 'Raja Bazaar Rawalpindi', 'Ayub National Park'], /rawalpindi|pindi/i],
  ['city.multan', ['Shah Rukn-e-Alam', 'Multan Fort', 'Multan shrine'], /multan|rukn/i],
  ['city.peshawar', ['Mahabat Khan Mosque', 'Qissa Khwani Bazaar', 'Peshawar old city'], /peshawar|mahabat|qissa/i],
  ['city.quetta', ['Hanna Lake Quetta', 'Quetta city', 'Chiltan Quetta'], /quetta|hanna|chiltan/i],
  ['city.hyderabad', ['Pacco Qillo Hyderabad Sindh', 'Hyderabad Sindh', 'Kotri Hyderabad'], /hyderabad|pacco|pakka|kotri/i],
  ['city.sukkur', ['Lansdowne Bridge Sukkur', 'Sukkur Barrage', 'Sukkur'], /sukkur|lansdowne|rohri/i],
  ['city.bahawalpur', ['Noor Mahal Bahawalpur', 'Derawar Fort', 'Bahawalpur'], /bahawalpur|noor mahal|derawar/i],
  ['city.faisalabad', ['Clock Tower Faisalabad', 'Faisalabad', 'Ghanta Ghar Faisalabad'], /faisalabad|lyallpur/i],
  ['city.sialkot', ['Sialkot Clock Tower', 'Sialkot Fort', 'Sialkot'], /sialkot/i],
  ['city.havelian', ['Abbottabad', 'Havelian', 'Hazara Pakistan'], /abbottabad|havelian|hazara/i],
  ['city.attock', ['Attock Fort', 'Attock Bridge', 'Attock Khurd'], /attock/i],
  ['city.rohri', ['Rohri Sindh', 'Sukkur Barrage Indus', 'Indus river Sindh'], /rohri|sukkur|sindh|indus/i],
  ['city.khanewal', ['Khanewal Junction', 'Punjab Pakistan fields', 'Khanewal'], /khanewal|punjab/i],

  // --- Landscapes used on discovery cards ---------------------------------
  ['scene.northern', ['Hunza Valley', 'Passu Cones', 'Karakoram Highway'], /hunza|passu|karakoram|gilgit/i],
  ['scene.indus', ['Indus River Pakistan Sindh', 'Sukkur Barrage Indus', 'Indus river Punjab Pakistan'], /indus/i],
  ['scene.desert', ['Cholistan Desert', 'Derawar Fort desert', 'Thar desert Sindh'], /cholistan|derawar|thar/i],
  ['scene.coast', ['Gwadar beach', 'Astola Island', 'Balochistan coast'], /gwadar|astola|balochistan|makran|pasni/i],
  ['scene.bolan', ['Bolan Pass railway', 'Bolan Pass Balochistan', 'Kojak Tunnel'], /bolan|kojak|balochistan/i],
  ['scene.khyber', ['Khyber Pass railway', 'Khyber Pass', 'Landi Kotal'], /khyber|landi kotal/i],

  // --- Trains and rolling stock -------------------------------------------
  ['train.locomotive', ['Pakistan Railways locomotive', 'Pakistan Railways diesel locomotive', 'Pakistan Railways GE locomotive'], /locomotive|loco\b/i],
  ['train.express', ['Pakistan Railways express train', 'Pakistan Railways passenger train', 'Pakistan Railways train'], /pakistan railways|pakistani train/i],
  ['train.coach', ['Pakistan Railways carriage', 'Pakistan Railways coach', 'Golra railway museum'], /coach|carriage|golra|saloon|compartment/i],
  ['train.track', ['Pakistan Railways railway line', 'Attock railway bridge Indus', 'Pakistan Railways track Punjab'], /railway line|railway track|railway bridge/i],

  // --- Stations -----------------------------------------------------------
  ['station.karachi-cantt', ['Karachi Cantonment railway station', 'Karachi City railway station'], /karachi/i],
  ['station.lahore', ['Lahore Junction railway station', 'Lahore railway station'], /lahore/i],
  ['station.rawalpindi', ['Rawalpindi railway station', 'Rawalpindi station'], /rawalpindi/i],
  ['station.peshawar', ['Peshawar Cantonment railway station', 'Peshawar railway station'], /peshawar/i],
  ['station.multan', ['Multan Cantonment railway station', 'Multan railway station'], /multan/i],
  ['station.quetta', ['Quetta railway station', 'Quetta station Balochistan'], /quetta/i],
  ['station.hyderabad', ['Hyderabad Sindh railway station', 'Kotri Junction railway station'], /hyderabad|kotri/i],
  ['station.rohri', ['Rohri Junction railway station', 'Rohri railway station'], /rohri/i],
  ['station.islamabad', ['Islamabad railway station', 'Margalla railway station', 'Golra Sharif Junction'], /islamabad|margalla|golra/i],
  ['station.bahawalpur', ['Bahawalpur railway station'], /bahawalpur/i],
];

const ALLOWED_LICENCE = /^(cc[- ]?by([- ]sa)?([- ]\d(\.\d)?)?|cc0|public domain|pd)/i;

/** Things that are not photographs of a place. */
const NOT_A_PHOTO = /\b(map|diagram|chart|logo|seal|flag|coat of arms|emblem|gauge|timetable|ticket stub|banknote|stamp|signature|graph|plan of|schematic|screenshot)\b/i;

/** Confusable places elsewhere in the world that these searches drag in. */
const WRONG_COUNTRY = /\b(india|indian|ladakh|leh|delhi|secunderabad|hyderabad, india|deccan|london|united kingdom|mexico|maya|yucat|bangladesh|iran|afghan(?!.*pakistan))\b/i;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let lastCall = 0;

/** Commons rate-limits anonymous clients hard. Be a good citizen about it. */
async function politeFetch(url) {
  const gap = Date.now() - lastCall;
  if (gap < 1300) await pause(1300 - gap);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    lastCall = Date.now();
    let response;
    let text = '';
    try {
      response = await fetch(url, { headers: { 'user-agent': 'MeridianRailBuild/1.0 (photo harvest)' } });
      text = await response.text();
    } catch {
      await pause(2500 * (attempt + 1));
      continue;
    }
    // The API answers a rate-limit with HTTP 200 and a plain-text body, so the
    // status code alone is not enough to detect it.
    if (response.status === 429 || /too many requests/i.test(text.slice(0, 200))) {
      await pause(4500 * (attempt + 1));
      continue;
    }
    return { ok: response.ok, text };
  }
  return { ok: false, text: '' };
}

async function search(term) {
  const url =
    `${API}?action=query&generator=search` +
    `&gsrsearch=${encodeURIComponent(`${term} filetype:bitmap`)}` +
    `&gsrnamespace=6&gsrlimit=14` +
    `&prop=imageinfo|categories&cllimit=30` +
    `&iiprop=url|extmetadata|size&iiurlwidth=1600&format=json`;

  const { ok, text } = await politeFetch(url);
  if (!ok) return [];
  try {
    return Object.values(JSON.parse(text)?.query?.pages ?? {});
  } catch {
    return [];
  }
}

const clean = (url) =>
  url.split('?')[0].replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/');

const plain = (html) =>
  String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

async function reachable(url) {
  try {
    const response = await fetch(url, { method: 'GET', headers: { range: 'bytes=0-2047' } });
    return response.ok || response.status === 206;
  } catch {
    return false;
  }
}

async function pick(term, mustMention, subjectKey) {
  const pages = await search(term);

  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info?.thumburl) continue;

    const meta = info.extmetadata ?? {};
    const licence = plain(meta.LicenseShortName?.value) || plain(meta.License?.value);
    if (!ALLOWED_LICENCE.test(licence)) continue;

    // Everything the file says about itself, in one haystack.
    const categories = (page.categories ?? []).map((c) => c.title).join(' ');
    const haystack = [
      page.title,
      plain(meta.ObjectName?.value),
      plain(meta.ImageDescription?.value),
      categories,
    ].join(' ');

    if (NOT_A_PHOTO.test(haystack)) continue;
    if (WRONG_COUNTRY.test(haystack)) continue;
    if (!/pakistan|pakistani/i.test(haystack)) continue;
    if (!mustMention.test(haystack)) continue;
    // For rolling stock, the file's own title has to name the thing. Categories
    // are too generous: "Pakistan Railways headquarters" is filed under
    // locomotives and would otherwise win a search for one.
    if (subjectKey.startsWith('train.') && !mustMention.test(`${page.title} ${plain(meta.ObjectName?.value)}`)) continue;

    // Landscape only: a portrait photo in a 3:2 card crops to someone's knees.
    if (info.thumbwidth && info.thumbheight && info.thumbwidth / info.thumbheight < 1.2) continue;
    if (info.thumbwidth && info.thumbwidth < 900) continue;

    const url = clean(info.thumburl);
    if (!(await reachable(url))) continue;

    return {
      url,
      title: plain(meta.ObjectName?.value) || page.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, ''),
      author: plain(meta.Artist?.value).slice(0, 90) || 'Unknown',
      licence,
      source: info.descriptionurl,
    };
  }
  return null;
}

const results = {};
let found = 0;

for (const [key, terms, mustMention] of SUBJECTS) {
  let photo = null;
  for (const term of terms) {
    photo = await pick(term, mustMention, key);
    if (photo) break;
  }
  if (photo) {
    results[key] = photo;
    found += 1;
    console.log(`ok   ${key.padEnd(24)} ${photo.title.slice(0, 56)}`);
  } else {
    console.log(`--   ${key.padEnd(24)} no verified match (falls back at runtime)`);
  }
}

const body = `/**
 * Real photography, harvested from Wikimedia Commons by scripts/harvest-photos.mjs.
 *
 * Every image here is an actual photograph of the place or train it labels,
 * under a licence that permits reuse, with the photographer credited. Run
 * \`npm run photos\` to refresh.
 *
 * Do not hand-edit. The script verifies that each candidate mentions Pakistan
 * and mentions its own subject, is a photograph rather than a diagram, is
 * landscape, and actually resolves over the network. A hand-added URL skips all
 * of that.
 *
 * Generated ${new Date().toISOString().slice(0, 10)} · ${found} photographs
 */

export interface Photo {
  url: string;
  title: string;
  author: string;
  licence: string;
  source: string;
}

export const PHOTOS: Record<string, Photo> = ${JSON.stringify(results, null, 2)};

/**
 * Optional self-hosted mirror.
 *
 * By default these URLs point at Wikimedia's own servers. Set
 * EXPO_PUBLIC_PHOTO_BASE_URL to serve the same photographs from your own CDN
 * instead: kinder to Commons at any real traffic volume, faster for users in
 * Pakistan, and it keeps the app working if a file is renamed upstream.
 * `npm run photos:mirror` downloads the set, named by key.
 */
const MIRROR = process.env.EXPO_PUBLIC_PHOTO_BASE_URL?.replace(/\/$/, '') ?? '';

function resolve(key: string, item: Photo): Photo {
  return MIRROR ? { ...item, url: `${MIRROR}/${key}.jpg` } : item;
}

/**
 * Photo for a key. Falls back to another photo in the same family (station.*,
 * city.*, scene.*, train.*) so a missing subject still renders a real,
 * on-theme photograph rather than an empty grey box.
 */
export function photo(key: string): Photo | undefined {
  const direct = PHOTOS[key];
  if (direct) return resolve(key, direct);

  const family = key.split('.')[0];
  const sibling = Object.entries(PHOTOS).find(([k]) => k.startsWith(`${family}.`));
  return sibling ? resolve(sibling[0], sibling[1]) : undefined;
}

/** Every key that has a photograph, for the mirror script. */
export function photoKeys(): string[] {
  return Object.keys(PHOTOS);
}

/** Attribution line to render under or beside an image. */
export function credit(item: Photo): string {
  return `${item.author} \u00b7 ${item.licence}`;
}
`;

writeFileSync(outFile, body);
console.log(`\n${found}/${SUBJECTS.length} photographs written to src/data/photos.ts`);
