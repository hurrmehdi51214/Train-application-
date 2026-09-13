#!/usr/bin/env node
/**
 * Draws the app icon, adaptive icon, splash and favicon from the Safar mark.
 *
 * The mark is generated in code rather than exported from a design tool: it
 * regenerates at any size, a reviewer can read exactly what is in it, and the
 * icon can never drift out of sync with the in-app `<LogoMark/>` because both
 * are built from the same measurements in the same 48-unit grid.
 *
 * `npm run assets` rebuilds everything under assets/.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(here, '..', 'assets');

const GREEN = [0x0e, 0x7a, 0x3a];
const GREEN_DEEP = [0x01, 0x41, 0x1c];
const WHITE = [0xff, 0xff, 0xff];

/* ------------------------------------------------------------- PNG writer */

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
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function encodePng(width, height, pixels) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------- signed-distance kit */

const roundedRect = (cx, cy, halfW, halfH, r) => (x, y) => {
  const dx = Math.abs(x - cx) - (halfW - r);
  const dy = Math.abs(y - cy) - (halfH - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};

const disc = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;

const capsule = (x1, y1, x2, y2, thickness) => (x, y) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) - thickness / 2;
};

/** Regular n-pointed star, as the union of its triangular points. */
const star = (cx, cy, outer, inner, points = 5, rotation = -Math.PI / 2) => (x, y) => {
  // Polar fold: reduce the plane to one wedge, then measure against one edge.
  const px = x - cx;
  const py = y - cy;
  const r = Math.hypot(px, py);
  if (r === 0) return -inner;
  const step = (Math.PI * 2) / points;
  let angle = Math.atan2(py, px) - rotation;
  angle = ((angle % step) + step) % step;
  if (angle > step / 2) angle = step - angle;
  const fx = r * Math.cos(angle);
  const fy = r * Math.sin(angle);
  // Edge from the outer tip to the inner vertex of the wedge.
  const ax = outer;
  const ay = 0;
  const bx = inner * Math.cos(step / 2);
  const by = inner * Math.sin(step / 2);
  const ex = bx - ax;
  const ey = by - ay;
  const t = Math.max(0, Math.min(1, ((fx - ax) * ex + (fy - ay) * ey) / (ex * ex + ey * ey)));
  const d = Math.hypot(fx - (ax + t * ex), fy - (ay + t * ey));
  // The wedge's interior lies on the side of the edge that contains the
  // centre; getting this sign backwards floods the whole canvas.
  const side = (fx - ax) * ey - (fy - ay) * ex;
  return side < 0 ? -d : d;
};

const union = (...fns) => (x, y) => Math.min(...fns.map((f) => f(x, y)));
const subtract = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));

/* ------------------------------------------------------------------ canvas */

class Canvas {
  constructor(width, height, background) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
    if (background) {
      for (let i = 0; i < width * height; i += 1) {
        this.pixels[i * 4] = background[0];
        this.pixels[i * 4 + 1] = background[1];
        this.pixels[i * 4 + 2] = background[2];
        this.pixels[i * 4 + 3] = 255;
      }
    }
  }

  blend(x, y, [r, g, b], a) {
    if (a <= 0) return;
    const i = (y * this.width + x) * 4;
    const alpha = Math.min(1, a);
    this.pixels[i] = Math.round(this.pixels[i] * (1 - alpha) + r * alpha);
    this.pixels[i + 1] = Math.round(this.pixels[i + 1] * (1 - alpha) + g * alpha);
    this.pixels[i + 2] = Math.round(this.pixels[i + 2] * (1 - alpha) + b * alpha);
    this.pixels[i + 3] = Math.max(this.pixels[i + 3], Math.round(255 * alpha));
  }

  /** Fills where the distance field is negative, feathering one pixel of edge. */
  fill(sdf, colour) {
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

/* -------------------------------------------------------------- the mark */

/**
 * Draws the Safar mark into `canvas`, sized to `unit` * 48 and centred on
 * (cx, cy). Coordinates below are the same 48-unit grid the React component
 * uses, so the two can be compared side by side.
 */
function drawMark(canvas, cx, cy, unit, { body = WHITE, glass = GREEN_DEEP } = {}) {
  const u = (v) => v * unit;
  const X = (v) => cx + u(v - 24);
  const Y = (v) => cy + u(v - 24);

  // Nose: an arch. A disc for the dome, a rounded box for the flanks.
  canvas.fill(
    union(
      disc(X(24), Y(18.4), u(10.4)),
      roundedRect(X(24), Y(28.2), u(10.4), u(9.8), u(3.8)),
    ),
    body,
  );

  // Windscreen.
  canvas.fill(roundedRect(X(24), Y(19.3), u(6.6), u(4.7), u(3.4)), glass);

  // The flag, inside the glass.
  canvas.fill(
    subtract(disc(X(22.9), Y(19.3), u(3.55)), disc(X(24.75), Y(19.3), u(3.5))),
    body,
  );
  canvas.fill(star(X(27.6), Y(19.6), u(2.5), u(1.05)), body);

  // Lamps.
  canvas.fill(disc(X(19.6), Y(29.8), u(2.1)), glass);
  canvas.fill(disc(X(28.4), Y(29.8), u(2.1)), glass);

  // Rails, receding.
  canvas.fill(capsule(X(15.9), Y(41.8), X(18.7), Y(37.8), u(2.4)), body);
  canvas.fill(capsule(X(32.1), Y(41.8), X(29.3), Y(37.8), u(2.4)), body);
}

/* ------------------------------------------------------------- the outputs */

function icon(size) {
  const canvas = new Canvas(size, size, GREEN);
  drawMark(canvas, size / 2, size / 2 - size * 0.012, size / 48);
  return canvas.toPng();
}

/** Android masks adaptive icons hard, so the mark sits in the 66% safe zone. */
function adaptiveIcon(size) {
  const canvas = new Canvas(size, size, GREEN);
  drawMark(canvas, size / 2, size / 2, (size * 0.68) / 48);
  return canvas.toPng();
}

function splash(width, height) {
  const canvas = new Canvas(width, height, GREEN);
  drawMark(canvas, width / 2, height / 2, (Math.min(width, height) * 0.42) / 48);
  return canvas.toPng();
}

/** Notification icons are masked to a silhouette, so draw solid white on clear. */
function notificationIcon(size) {
  const canvas = new Canvas(size, size, null);
  drawMark(canvas, size / 2, size / 2, (size * 0.86) / 48, { body: WHITE, glass: WHITE });
  return canvas.toPng();
}

mkdirSync(assetsDir, { recursive: true });

const outputs = {
  'icon.png': icon(1024),
  'adaptive-icon.png': adaptiveIcon(1024),
  'favicon.png': icon(64),
  'splash.png': splash(1284, 2778),
  'notification-icon.png': notificationIcon(96),
};

for (const [name, buffer] of Object.entries(outputs)) {
  writeFileSync(resolve(assetsDir, name), buffer);
  console.log(`assets/${name}  ${(buffer.length / 1024).toFixed(1)} KB`);
}
