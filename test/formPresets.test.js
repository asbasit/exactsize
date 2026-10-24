import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { placeImage, matchAspect } from '../src/lib/fit.js';

const data = JSON.parse(readFileSync(new URL('../src/data/formPresets.json', import.meta.url)));
const all = data.pages.flatMap((p) => p.presets.map((x) => ({ ...x, page: p })));
const byId = Object.fromEntries(all.map((p) => [p.id, p]));

test('every form page has an official https source and a verified date', () => {
  for (const p of data.pages) {
    assert.match(p.sourceUrl, /^https:\/\//, p.slug);
    assert.match(p.lastVerified, /^\d{4}-\d{2}-\d{2}$/, p.slug);
    assert.match(p.slug, /^[a-z0-9-]+$/);
    assert.ok(p.title.length <= 75, `${p.slug} title is ${p.title.length} chars`);
    assert.ok(p.description.length <= 170, `${p.slug} description is ${p.description.length} chars`);
    assert.ok(p.presets.length > 0);
  }
  assert.equal(new Set(data.pages.map((p) => p.slug)).size, data.pages.length, 'slugs are unique');
});

test('every preset is internally consistent', () => {
  for (const p of all) {
    assert.ok(p.maxKB > 0, p.id);
    if (p.minKB != null) assert.ok(p.minKB < p.maxKB, p.id);
    assert.equal(p.width == null, p.height == null, `${p.id}: give both pixel sides or neither`);
    if (p.width != null) assert.ok(p.width >= 16 && p.height >= 16, p.id);
    assert.ok(['cover', 'contain'].includes(p.fit), p.id);
    assert.ok(p.quote.length > 20 && p.pixelsText, p.id);
  }
  assert.equal(new Set(all.map((p) => p.id)).size, all.length, 'ids are unique');
});

test('presets match the official numbers', () => {
  const pick = (id) => { const p = byId[id]; return [p.width, p.height, p.minKB, p.maxKB]; };
  assert.deepEqual(pick('ibps-photo'), [200, 230, 20, 50]);
  assert.deepEqual(pick('ibps-signature'), [140, 60, 10, 20]);
  assert.deepEqual(pick('ibps-left-thumb'), [240, 240, 20, 50]);
  assert.deepEqual(pick('ibps-declaration'), [800, 400, 50, 100]);
  assert.deepEqual(pick('upsc-photo'), [null, null, 20, 200]);
  assert.deepEqual(pick('ssc-signature'), [null, null, 10, 20]);
  // UPSC: each side 350-500 px.
  const u = byId['upsc-signature'];
  for (const side of [u.width, u.height]) assert.ok(side >= 350 && side <= 500);
  assert.deepEqual([u.minKB, u.maxKB], [20, 100]);
  // US visa: square, 600-1200 px, max 240 kB.
  const v = byId['us-ds160-photo'];
  assert.equal(v.width, v.height);
  assert.ok(v.width >= 600 && v.width <= 1200);
  assert.equal(v.maxKB, 240);
  // Fixed file names the UPSC portal asks for.
  assert.equal(byId['upsc-photo'].fileName, 'photo');
  assert.equal(byId['upsc-signature'].fileName, 'signature');
});

test('placeImage cover crops the centre and fills the frame', () => {
  const p = placeImage('cover', 4000, 3000, 600, 600);
  assert.deepEqual(p, { sx: 500, sy: 0, sw: 3000, sh: 3000, dx: 0, dy: 0, dw: 600, dh: 600 });
});

test('placeImage contain keeps the whole picture centred with margins', () => {
  const p = placeImage('contain', 4000, 3000, 600, 600);
  assert.deepEqual(p, { sx: 0, sy: 0, sw: 4000, sh: 3000, dx: 0, dy: 75, dw: 600, dh: 450 });
  const tall = placeImage('contain', 1000, 3000, 400, 500);
  assert.equal(tall.dh, 500);
  assert.equal(tall.dw, 167);
  assert.equal(tall.dx, Math.round((400 - 167) / 2));
});

test('placeImage stretch uses the whole source and the whole frame', () => {
  assert.deepEqual(placeImage('stretch', 123, 45, 600, 600), { sx: 0, sy: 0, sw: 123, sh: 45, dx: 0, dy: 0, dw: 600, dh: 600 });
});

test('matchAspect fills in the missing side', () => {
  assert.deepEqual(matchAspect(4000, 3000, 800, ''), { w: 800, h: 600 });
  assert.deepEqual(matchAspect(4000, 3000, '', 300), { w: 400, h: 300 });
  assert.deepEqual(matchAspect(4000, 3000, 800, 800), { w: 800, h: 800 });
  assert.deepEqual(matchAspect(3, 1000, 1, ''), { w: 1, h: 333 });
  assert.deepEqual(matchAspect(1000, 3, 1, ''), { w: 1, h: 1 }, 'never returns 0 px');
  assert.deepEqual(matchAspect(0, 0, 10, ''), { w: 0, h: 0 });
});
