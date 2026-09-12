#!/usr/bin/env node
/**
 * Generates the app icons and splash image.
 *
 * The mark is drawn in code rather than checked in as a binary blob from a
 * design tool: it is forty lines of maths, it regenerates at any size, and a
 * reviewer can see exactly what is in the icon by reading it. `npm run assets`
 * rebuilds every file under assets/.
 *
 * Output is written with a hand-rolled PNG encoder (zlib is in Node, and PNG's
 * container format is small) so the repository needs no image dependency.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(here, '..', 'assets');

const INK = [0x0b, 0x1a, 0x22];
const PETROL = [0x0f, 0x5d, 0x5a];
const PETROL_LIFT = [0x17, 0x85, 0x7f];
const BRASS = [0xe0, 0xa3, 0x4e];
const PAPER = [0xf6, 0xf9, 0xf9];

function crc32(buffer) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** pixels: Uint8Array of RGBA, length width*height*4 */
function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

class Canvas {
  constructor(width, height, background = [0, 0, 0, 0]) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      this.pixels[i * 4] = background[0];
      this.pixels[i * 4 + 1] = background[1];
      this.pixels[i * 4 + 2] = background[2];
      this.pixels[i * 4 + 3] = background[3] ?? 255;
    }
  }

  /** Alpha-composites a colour at (x, y). `a` is 0..1 and is used for AA. */
  blend(x, y, [r, g, b], a = 1) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    const alpha = Math.min(1, a);
    this.pixels[i] = Math.round(this.pixels[i] * (1 - alpha) + r * alpha);
    this.pixels[i + 1] = Math.round(this.pixels[i + 1] * (1 - alpha) + g * alpha);
    this.pixels[i + 2] = Math.round(this.pixels[i + 2] * (1 - alpha) + b * alpha);
    this.pixels[i + 3] = Math.max(this.pixels[i + 3], Math.round(255 * alpha));
  }

  /**
   * Fills every pixel whose signed distance to a shape is negative, feathering
   * the last pixel of the edge. One generic routine covers the rounded square,
   * the discs and the rails, which is why the mark stays crisp at 48px.
   */
  fillSdf(sdf, colour) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const d = sdf(x + 0.5, y + 0.5);
        if (d < 1) this.blend(x, y, colour, Math.min(1, 1 - d));
      }
    }
  }

  toPng() {
    return encodePng(this.width, this.height, this.pixels);
  }
}

const roundedSquare = (cx, cy, half, radius) => (x, y) => {
  const dx = Math.abs(x - cx) - (half - radius);
  const dy = Math.abs(y - cy) - (half - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
};

const disc = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;

/** Capsule: the signed distance to a thick line segment. */
const capsule = (x1, y1, x2, y2, thickness) => (x, y) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSq));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) - thickness / 2;
};

/**
 * The mark: two rails running to a vanishing point, with sleepers, inside a
 * rounded square. It reads as "railway" at 1024px and still reads as an arrow
 * pointing forward at 48px, which is the size that actually matters.
 */
function drawMark(canvas, size, { background = true } = {}) {
  const c = size / 2;
  const plate = size * 0.34;

  if (background) {
    canvas.fillSdf(roundedSquare(c, c, plate, plate * 0.42), PETROL);
    // A soft lift along the top edge so the plate is not a flat slab.
    canvas.fillSdf(roundedSquare(c, c - plate * 0.06, plate * 0.97, plate * 0.42), PETROL_LIFT);
    canvas.fillSdf(roundedSquare(c, c + plate * 0.03, plate * 0.95, plate * 0.4), PETROL);
  }

  const top = c - plate * 0.5;
  const bottom = c + plate * 0.58;
  const spread = plate * 0.46;
  // The rails converge but never meet: a closed apex reads as a letter A, an
  // open one reads as track running to a vanishing point.
  const apex = size * 0.052;
  const railWidth = size * 0.034;

  // Sleepers first, so the rails sit over them. Each one is inset to the rail
  // centres at its own height, so nothing pokes out past the track.
  const sleepers = 5;
  for (let i = 0; i < sleepers; i += 1) {
    const t = (i + 0.55) / sleepers;
    const y = top + (bottom - top) * t;
    const halfWidth = apex + (spread - apex) * t - railWidth * 0.25;
    canvas.fillSdf(
      capsule(c - halfWidth, y, c + halfWidth, y, railWidth * 0.52),
      background ? PAPER : PETROL,
    );
  }

  canvas.fillSdf(capsule(c - spread, bottom, c - apex, top, railWidth), BRASS);
  canvas.fillSdf(capsule(c + spread, bottom, c + apex, top, railWidth), BRASS);
}

function icon(size) {
  const canvas = new Canvas(size, size, [...INK, 255]);
  drawMark(canvas, size);
  return canvas.toPng();
}

/** Adaptive icons are masked hard, so the mark sits inside the 66% safe zone. */
function adaptiveIcon(size) {
  const canvas = new Canvas(size, size, [...INK, 255]);
  const inner = new Canvas(size, size, [0, 0, 0, 0]);
  drawMark(inner, size * 0.72);
  const offset = Math.round(size * 0.14);
  for (let y = 0; y < size * 0.72; y += 1) {
    for (let x = 0; x < size * 0.72; x += 1) {
      const i = (y * size + x) * 4;
      const alpha = inner.pixels[i + 3] / 255;
      if (alpha > 0) {
        canvas.blend(x + offset, y + offset, [inner.pixels[i], inner.pixels[i + 1], inner.pixels[i + 2]], alpha);
      }
    }
  }
  return canvas.toPng();
}

function splash(width, height) {
  const canvas = new Canvas(width, height, [...INK, 255]);
  const size = Math.min(width, height);
  const square = new Canvas(size, size, [0, 0, 0, 0]);
  drawMark(square, size * 0.62);
  const ox = Math.round((width - size * 0.62) / 2);
  const oy = Math.round((height - size * 0.62) / 2);
  for (let y = 0; y < size * 0.62; y += 1) {
    for (let x = 0; x < size * 0.62; x += 1) {
      const i = (y * size + x) * 4;
      const alpha = square.pixels[i + 3] / 255;
      if (alpha > 0) {
        canvas.blend(x + ox, y + oy, [square.pixels[i], square.pixels[i + 1], square.pixels[i + 2]], alpha);
      }
    }
  }
  return canvas.toPng();
}

mkdirSync(assetsDir, { recursive: true });

const outputs = {
  'icon.png': icon(1024),
  'adaptive-icon.png': adaptiveIcon(1024),
  'favicon.png': icon(64),
  'splash.png': splash(1284, 2778),
  'notification-icon.png': icon(96),
};

for (const [name, buffer] of Object.entries(outputs)) {
  writeFileSync(resolve(assetsDir, name), buffer);
  console.log(`assets/${name}  ${(buffer.length / 1024).toFixed(1)} KB`);
}
