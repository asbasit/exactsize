// Size-fitting engine. Pure logic, no DOM: the browser passes in an encoder.
// encode(quality 0..1, scale 0..1) -> Promise<{ size: number, data: any }>

// "KB" is ambiguous: some sites mean 1000 bytes, others 1024.
// To be safe under both, the max uses 1000 and the min uses 1024.
export function targetBytes(minKB, maxKB) {
  const max = Number(maxKB);
  const min = Number(minKB) || 0;
  if (!(max > 0)) throw new Error('Enter a maximum size above 0 KB.');
  if (min < 0) throw new Error('The minimum size can\'t be negative.');
  if (min >= max) throw new Error('The minimum has to be smaller than the maximum.');
  let lo = Math.ceil(min * 1024);
  let hi = Math.floor(max * 1000);
  // A narrow range (e.g. 49–50 KB) can't satisfy both definitions; fall back to one.
  if (lo > hi) {
    lo = Math.ceil(min * 1000);
    hi = Math.floor(max * 1024);
  }
  return { min: lo, max: hi };
}

const TOP_Q = 92;      // percent; above this JPEG grows fast for little visible gain
const FLOOR_Q = 60;    // below this, shrinking the pixels usually looks better than more compression
const LAST_Q = 5;      // last resort when the pixel size can't shrink further
const MIN_SIDE = 64;   // never shrink the longest side below this many pixels

// Largest quality (integer percent) in [loQ, hiQ] whose output is <= max.
// Assumes the encoder output at loQ already fits.
async function searchQuality(encode, scale, loQ, hiQ, max, first, count) {
  let best = { q: loQ, r: first };
  let lo = loQ, hi = hiQ + 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const r = await encode(mid / 100, scale); count.n++;
    if (r.size <= max) { lo = mid; best = { q: mid, r }; } else { hi = mid; }
  }
  return best;
}

export async function fitToSize(encode, opts) {
  const { max, width = 0, height = 0, fixedPixels = false, maxPasses = 10 } = opts;
  const count = { n: 0 };
  const longest = Math.max(width, height) || Infinity;
  let scale = 1;

  for (let pass = 0; pass < maxPasses; pass++) {
    const top = await encode(TOP_Q / 100, scale); count.n++;
    if (top.size <= max) return done(top, TOP_Q, scale, count);

    const canShrink = !fixedPixels && longest * scale * 0.95 >= MIN_SIDE;
    const floorQ = canShrink ? FLOOR_Q : LAST_Q;
    const low = await encode(floorQ / 100, scale); count.n++;

    if (low.size <= max) {
      const best = await searchQuality(encode, scale, floorQ, TOP_Q - 1, max, low, count);
      return done(best.r, best.q, scale, count);
    }
    if (!canShrink) {
      return { ok: false, reason: fixedPixels ? 'fixed-too-big' : 'cannot-fit', attempts: count.n };
    }
    // File size grows roughly with pixel count, so scale each side by sqrt of the ratio.
    const factor = Math.sqrt(max / low.size) * 0.97;
    scale *= Math.min(0.95, Math.max(0.5, factor));
    if (longest !== Infinity && longest * scale < MIN_SIDE) scale = MIN_SIDE / longest;
  }
  return { ok: false, reason: 'cannot-fit', attempts: count.n };
}

function done(r, q, scale, count) {
  return { ok: true, data: r.data, size: r.size, quality: q, scale, attempts: count.n };
}

// Make a JPEG bigger without touching the picture, by adding comment (COM) segments
// right after the start-of-image marker. Viewers ignore them. Returns a new Uint8Array
// of exactly `target` bytes (or target+ up to 3 bytes if the gap is under 4 bytes).
export function padJpeg(bytes, target) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG file.');
  let add = target - bytes.length;
  if (add <= 0) return bytes;
  if (add < 4) add = 4; // smallest possible segment: marker (2) + length (2)

  const MAX_SEG = 2 + 65535; // marker + max length field value (which counts itself)
  const n = Math.ceil(add / MAX_SEG);
  const base = Math.floor(add / n);
  let extra = add - base * n;

  const out = new Uint8Array(bytes.length + add);
  out[0] = 0xff; out[1] = 0xd8;
  let p = 2;
  for (let i = 0; i < n; i++) {
    const segTotal = base + (extra-- > 0 ? 1 : 0);
    const len = segTotal - 2; // length field includes its own 2 bytes
    out[p++] = 0xff; out[p++] = 0xfe;
    out[p++] = (len >> 8) & 0xff; out[p++] = len & 0xff;
    out.fill(0x20, p, p + len - 2); // spaces
    p += len - 2;
  }
  out.set(bytes.subarray(2), p);
  return out;
}

// Output pixel size for an optional exact width x height, cropping to fill (centered).
export function coverCrop(srcW, srcH, outW, outH) {
  const srcRatio = srcW / srcH, outRatio = outW / outH;
  let sw = srcW, sh = srcH;
  if (srcRatio > outRatio) sw = Math.round(srcH * outRatio);
  else sh = Math.round(srcW / outRatio);
  return { sx: Math.round((srcW - sw) / 2), sy: Math.round((srcH - sh) / 2), sw, sh };
}

// Where to draw the source on an outW x outH canvas.
// cover: crop from the centre to fill. contain: whole picture, white margins. stretch: distort to fill.
// Returns the source rect (sx, sy, sw, sh) and the destination rect (dx, dy, dw, dh).
export function placeImage(mode, srcW, srcH, outW, outH) {
  if (mode === 'contain') {
    const k = Math.min(outW / srcW, outH / srcH);
    const dw = Math.max(1, Math.round(srcW * k)), dh = Math.max(1, Math.round(srcH * k));
    return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: Math.round((outW - dw) / 2), dy: Math.round((outH - dh) / 2), dw, dh };
  }
  if (mode === 'stretch') return { sx: 0, sy: 0, sw: srcW, sh: srcH, dx: 0, dy: 0, dw: outW, dh: outH };
  return { ...coverCrop(srcW, srcH, outW, outH), dx: 0, dy: 0, dw: outW, dh: outH };
}

// Fill in the missing side from the picture's aspect ratio. Returns 0 for anything invalid.
export function matchAspect(srcW, srcH, w, h) {
  w = Math.round(Number(w) || 0); h = Math.round(Number(h) || 0);
  if (!(srcW > 0 && srcH > 0)) return { w: 0, h: 0 };
  if (w > 0 && !(h > 0)) return { w, h: Math.max(1, Math.round((w * srcH) / srcW)) };
  if (h > 0 && !(w > 0)) return { w: Math.max(1, Math.round((h * srcW) / srcH)), h };
  return { w: Math.max(0, w), h: Math.max(0, h) };
}

export function formatKB(bytes) {
  const kb = bytes / 1024;
  return kb < 10 ? kb.toFixed(1) : String(Math.round(kb));
}
