import test from 'node:test';
import assert from 'node:assert/strict';
import { targetBytes, fitToSize, padJpeg, coverCrop } from '../src/lib/fit.js';

// Fake encoder: size grows with quality and with pixel count, like a real JPEG.
function fakeEncoder(w, h, bytesPerPixelAtTop = 0.6) {
  const calls = [];
  const encode = async (q, s) => {
    calls.push([q, s]);
    const px = Math.round(w * s) * Math.round(h * s);
    const size = Math.round(px * bytesPerPixelAtTop * (0.05 + 0.95 * q ** 3)) + 600;
    return { size, data: { q, s } };
  };
  return { encode, calls };
}

test('targetBytes is safe under both KB definitions', () => {
  assert.deepEqual(targetBytes(0, 50), { min: 0, max: 50000 });
  assert.deepEqual(targetBytes(20, 50), { min: 20480, max: 50000 });
});

test('targetBytes falls back for a very narrow range', () => {
  const t = targetBytes(49, 50); // 49*1024 = 50176 > 50000
  assert.deepEqual(t, { min: 49000, max: 51200 });
});

test('targetBytes rejects bad input', () => {
  assert.throws(() => targetBytes(0, 0));
  assert.throws(() => targetBytes(60, 50));
  assert.throws(() => targetBytes(-1, 50));
});

test('a small image that already fits keeps top quality and full size', async () => {
  const { encode } = fakeEncoder(200, 150);
  const r = await fitToSize(encode, { max: 50000, width: 200, height: 150 });
  assert.equal(r.ok, true);
  assert.equal(r.quality, 92);
  assert.equal(r.scale, 1);
});

test('result is under the max and quality is the highest that fits', async () => {
  const { encode } = fakeEncoder(1000, 800);
  const max = 200000;
  const r = await fitToSize(encode, { max, width: 1000, height: 800 });
  assert.equal(r.ok, true);
  assert.ok(r.size <= max);
  assert.equal(r.scale, 1);
  const next = await encode((r.quality + 1) / 100, r.scale);
  assert.ok(next.size > max, 'one step more quality should not fit');
});

test('a large photo is scaled down to hit 20 KB at decent quality', async () => {
  const { encode } = fakeEncoder(4032, 3024);
  const max = 20000;
  const r = await fitToSize(encode, { max, width: 4032, height: 3024 });
  assert.equal(r.ok, true);
  assert.ok(r.size <= max);
  assert.ok(r.scale < 1);
  assert.ok(r.quality >= 60, `quality ${r.quality} should stay at or above 60`);
  assert.ok(r.attempts < 40, `took ${r.attempts} encodes`);
});

test('fixed pixel size that cannot fit reports a clear reason', async () => {
  const { encode } = fakeEncoder(4000, 3000);
  const r = await fitToSize(encode, { max: 5000, width: 4000, height: 3000, fixedPixels: true });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'fixed-too-big');
});

test('fixed pixel size drops quality instead of pixels', async () => {
  const { encode } = fakeEncoder(600, 600);
  const r = await fitToSize(encode, { max: 40000, width: 600, height: 600, fixedPixels: true });
  assert.equal(r.ok, true);
  assert.equal(r.scale, 1);
  assert.ok(r.size <= 40000);
});

function fakeJpeg(n) {
  const b = new Uint8Array(n);
  b[0] = 0xff; b[1] = 0xd8; b[n - 2] = 0xff; b[n - 1] = 0xd9;
  for (let i = 2; i < n - 2; i++) b[i] = i % 251;
  return b;
}

// Walk the segments we added and check each length field is consistent.
function checkComSegments(out, original) {
  assert.equal(out[0], 0xff); assert.equal(out[1], 0xd8);
  let p = 2;
  while (out[p] === 0xff && out[p + 1] === 0xfe) {
    const len = (out[p + 2] << 8) | out[p + 3];
    assert.ok(len >= 2 && len <= 65535);
    p += 2 + len;
  }
  assert.deepEqual(out.subarray(p), original.subarray(2));
}

test('padJpeg hits the exact target size', () => {
  const src = fakeJpeg(15000);
  const out = padJpeg(src, 20480);
  assert.equal(out.length, 20480);
  checkComSegments(out, src);
});

test('padJpeg splits gaps larger than one segment', () => {
  const src = fakeJpeg(1000);
  const out = padJpeg(src, 300000);
  assert.equal(out.length, 300000);
  checkComSegments(out, src);
});

test('padJpeg handles tiny gaps and no-op cases', () => {
  const src = fakeJpeg(1000);
  assert.equal(padJpeg(src, 1002).length, 1004);
  assert.equal(padJpeg(src, 900), src);
  assert.throws(() => padJpeg(new Uint8Array([1, 2, 3]), 10));
});

test('coverCrop centres the crop', () => {
  assert.deepEqual(coverCrop(4000, 3000, 600, 600), { sx: 500, sy: 0, sw: 3000, sh: 3000 });
  assert.deepEqual(coverCrop(3000, 4000, 300, 200), { sx: 0, sy: 1000, sw: 3000, sh: 2000 });
});
