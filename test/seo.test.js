import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allRoutes, latestVerified } from '../src/lib/routes.js';

const manifest = JSON.parse(readFileSync(new URL('../public/manus-routes.json', import.meta.url), 'utf8')).routes.map((r) => r.path);
const base = readFileSync(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');

test('sitemap route list matches the route manifest exactly', () => {
  assert.deepEqual([...allRoutes()].sort(), [...manifest].sort());
});

test('sitemap routes are unique and use trailing slashes', () => {
  const r = allRoutes();
  assert.equal(new Set(r).size, r.length);
  for (const p of r) assert.match(p, /^\/([a-z0-9-]+\/)*$/);
});

test('every page gets a canonical URL and Open Graph tags', () => {
  for (const tag of ['rel="canonical"', 'og:url', 'og:image', 'og:title', 'og:description', 'twitter:card']) {
    assert.ok(base.includes(tag), `missing ${tag}`);
  }
});

test('latestVerified picks the newest date', () => {
  assert.equal(latestVerified('2026-10-17', '2026-10-24', '2026-10-18'), '2026-10-24');
});
