/**
 * generate-icons.js
 * Generates PNG icon files for the PhishCatch Chrome extension.
 * Uses only built-in Node.js modules (no npm packages required).
 *
 * Usage: node generate-icons.js
 *
 * Output: extension/icons/icon16.png, icon48.png, icon128.png
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── PNG helpers ────────────────────────────────────────────────────────────

/** Write a 4-byte big-endian unsigned integer into a Buffer at offset */
function writeUInt32BE(buf, value, offset) {
  buf[offset]     = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>>  8) & 0xff;
  buf[offset + 3] =  value         & 0xff;
}

/** CRC-32 table (PNG uses CRC-32 over chunk type + data) */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Build a PNG chunk: [length(4)] [type(4)] [data] [crc(4)]
 */
function pngChunk(typeStr, data) {
  const type = Buffer.from(typeStr, 'ascii');
  const len  = Buffer.alloc(4);
  writeUInt32BE(len, data.length, 0);

  const crcBuf = Buffer.concat([type, data]);
  const crcVal = Buffer.alloc(4);
  writeUInt32BE(crcVal, crc32(crcBuf), 0);

  return Buffer.concat([len, type, data, crcVal]);
}

/**
 * PNG "filter" byte prepended to each scanline.
 * We use filter type 0 (None) for simplicity.
 */

/**
 * Generate a minimal RGBA PNG buffer for a given size and pixel-drawing callback.
 * drawPixel(x, y) must return [r, g, b, a].
 */
function buildPNG(width, height, drawPixel) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width(4) height(4) bitDepth(1) colorType(1=grayscale,2=RGB,3=indexed,6=RGBA)
  //        compression(1) filter(1) interlace(1)
  const ihdrData = Buffer.alloc(13);
  writeUInt32BE(ihdrData, width,  0);
  writeUInt32BE(ihdrData, height, 4);
  ihdrData[8]  = 8; // bit depth
  ihdrData[9]  = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // adaptive filtering
  ihdrData[12] = 0; // no interlace
  const ihdr = pngChunk('IHDR', ihdrData);

  // Raw image data: for each row, filter-byte (0) + 4 bytes per pixel (RGBA)
  const rawSize = height * (1 + width * 4);
  const raw = Buffer.alloc(rawSize);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    raw[pos++] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y);
      raw[pos++] = r;
      raw[pos++] = g;
      raw[pos++] = b;
      raw[pos++] = a;
    }
  }

  // Compress with zlib (deflate)
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idat = pngChunk('IDAT', compressed);

  // IEND
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// ─── Drawing logic ──────────────────────────────────────────────────────────

/**
 * Draw a PhishCatch icon pixel at (x, y) for a canvas of given size.
 * Design: purple/indigo gradient shield with a white fish hook and a red cross-out line.
 *
 * Returns [r, g, b, a].
 */
function drawPhishCatchPixel(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;

  // Normalise coordinates to [-1, 1]
  const nx = (x - cx) / (size / 2);
  const ny = (y - cy) / (size / 2);

  // ── Shield shape ──────────────────────────────────────────────────────────
  // The shield is defined in normalised space.
  // Top: flat edge from -0.75 to 0.75 at ny = -0.92
  // Sides taper slightly
  // Bottom: rounded point
  const shieldLeft  = -0.75 + Math.max(0, ny) * 0.05;
  const shieldRight =  0.75 - Math.max(0, ny) * 0.05;

  // Bottom half: ellipse-like taper to point
  let shieldBottom = 0.92;
  let inShield = false;

  if (ny < -0.92) {
    // above shield
    inShield = false;
  } else if (ny >= -0.92 && ny <= 0.2) {
    // rectangular-ish top portion
    inShield = nx >= shieldLeft && nx <= shieldRight;
  } else {
    // bottom tapered portion: use ellipse equation
    // x^2 / (0.75 - 0.75*(ny-0.2)/0.72)^2 + ((ny - 0.92) / 0.72)^2 <= 1  -> simplified
    const progress = (ny - 0.2) / 0.72; // 0 at ny=0.2, 1 at ny=0.92
    const halfWidth = 0.75 * (1 - progress);
    inShield = (ny <= 0.92) && (nx >= -halfWidth) && (nx <= halfWidth);
  }

  if (!inShield) {
    return [0, 0, 0, 0]; // transparent
  }

  // ── Shield gradient fill ──────────────────────────────────────────────────
  // Indigo #6366f1 = (99, 102, 241)  to  violet #7c3aed = (124, 58, 237)
  // Gradient top-left -> bottom-right
  const t = (nx + 1) / 2 * 0.4 + (ny + 1) / 2 * 0.6; // 0..1
  const sr = Math.round(99  + (124 - 99)  * t);
  const sg = Math.round(102 + (58  - 102) * t);
  const sb = Math.round(241 + (237 - 241) * t);

  // ── Fish hook (J shape, white) ─────────────────────────────────────────────
  // We draw as thick strokes in pixel space.
  // Scaled coordinates for hook:
  const s = size;

  // Hook vertical stem: x from 0.18*s..0.22*s, y from 0.1*s..0.62*s
  const stemX  = 0.60 * s;
  const stemY1 = 0.14 * s;
  const stemY2 = 0.62 * s;
  const stemThick = Math.max(1, s * 0.055);

  // Hook curve: semicircle centred at (0.42*s, 0.62*s), radius 0.18*s, lower half
  const hookCX = 0.42 * s;
  const hookCY = 0.62 * s;
  const hookR  = 0.18 * s;
  const hookThick = Math.max(1, s * 0.055);

  // Hook barb: line from (0.42*s, 0.62*s) to (0.55*s, 0.50*s)
  const barbX1 = 0.42 * s, barbY1 = 0.44 * s;
  const barbX2 = 0.55 * s, barbY2 = 0.34 * s;

  // Eye of hook: small circle at top of stem
  const eyeX = stemX, eyeY = stemY1;
  const eyeR = Math.max(1.5, s * 0.04);
  const eyeThick = Math.max(1, s * 0.04);

  // Distance to vertical stem
  let onHook = false;

  if (x >= stemX - stemThick / 2 && x <= stemX + stemThick / 2 &&
      y >= stemY1 && y <= stemY2) {
    onHook = true;
  }

  // Distance to hook curve (lower half of circle)
  const dx = x - hookCX;
  const dy = y - hookCY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (Math.abs(dist - hookR) <= hookThick / 2 && dy >= -hookThick / 2) {
    // only the bottom half (including left side reaching up to stem)
    // The curve goes from the bottom of stem (angle ~0 = right) around to left side
    const angle = Math.atan2(dy, dx); // -pi..pi
    // We want: right side going down and left (from ~-90deg..90deg bottom arc)
    // Stem is at right (angle ~= -90 deg = -PI/2 from hookCY perspective when above)
    // Actually stem meets hook at (stemX, hookCY) = right of hookCX
    // So angle of stem junction = atan2(0, stemX-hookCX) = 0 (east)
    // Curve goes clockwise from east (0) down to west (PI), i.e. angle in [0, PI]
    if (angle >= -0.15 && angle <= Math.PI + 0.15) {
      onHook = true;
    }
  }

  // Barb line
  {
    const bDx = barbX2 - barbX1;
    const bDy = barbY2 - barbY1;
    const bLen = Math.sqrt(bDx * bDx + bDy * bDy);
    const bNx = bDx / bLen, bNy = bDy / bLen;
    const tVal = ((x - barbX1) * bNx + (y - barbY1) * bNy);
    if (tVal >= 0 && tVal <= bLen) {
      const perpDist = Math.abs((x - barbX1) * bNy - (y - barbY1) * bNx);
      if (perpDist <= hookThick / 2) {
        onHook = true;
      }
    }
  }

  // Eye circle
  {
    const eDist = Math.sqrt((x - eyeX) ** 2 + (y - eyeY) ** 2);
    if (Math.abs(eDist - eyeR) <= eyeThick / 2) {
      onHook = true;
    }
  }

  // ── Red cross-out line (diagonal) ─────────────────────────────────────────
  // Line from (0.15*s, 0.15*s) to (0.85*s, 0.85*s)
  const lineThick = Math.max(1.5, s * 0.07);
  const lx1 = 0.15 * s, ly1 = 0.15 * s;
  const lx2 = 0.85 * s, ly2 = 0.85 * s;
  const lDx = lx2 - lx1, lDy = ly2 - ly1;
  const lLen = Math.sqrt(lDx * lDx + lDy * lDy);
  const lNx = lDx / lLen, lNy = lDy / lLen;
  const lt  = ((x - lx1) * lNx + (y - ly1) * lNy);
  const lPerp = Math.abs((x - lx1) * lNy - (y - ly1) * lNx);
  const onLine = lt >= 0 && lt <= lLen && lPerp <= lineThick / 2;

  if (onLine) {
    // Red #ef4444 = (239, 68, 68)
    return [239, 68, 68, 255];
  }

  if (onHook) {
    return [255, 255, 255, 255];
  }

  return [sr, sg, sb, 255];
}

// ─── Main ────────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(__dirname, 'extension', 'icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SIZES = [16, 48, 128];

for (const size of SIZES) {
  console.log(`Generating icon${size}.png (${size}x${size})...`);
  const png = buildPNG(size, size, (x, y) => drawPhishCatchPixel(x, y, size));
  const outPath = path.join(OUTPUT_DIR, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`  Saved: ${outPath} (${png.length} bytes)`);
}

console.log('\nDone! PNG icons generated successfully.');
