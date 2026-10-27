import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = JSON.parse(readFileSync(new URL('../public/manus-routes.json', import.meta.url), 'utf8')).routes;
const routePaths = new Set(routes.map((route) => route.path));
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const base = read('../src/layouts/Base.astro');
const contact = read('../src/pages/contact.astro');
const privacy = read('../src/pages/privacy.astro');
const terms = read('../src/pages/terms.astro');

test('About, Contact, Privacy, and Terms are declared as static routes', () => {
  for (const path of ['/about/', '/contact/', '/privacy/', '/terms/']) {
    assert.ok(routePaths.has(path), `${path} is missing from the route manifest`);
  }
});

test('the shared footer links to every information page', () => {
  for (const path of ['/about/', '/contact/', '/privacy/', '/terms/']) {
    assert.ok(base.includes(`href="${path}"`), `footer link missing: ${path}`);
  }
});

test('Contact and Privacy use the owner-provided email address', () => {
  const mailto = 'mailto:periscopebookeeping@gmail.com';
  assert.ok(contact.includes(mailto));
  assert.ok(privacy.includes(mailto));
});

test('Privacy describes local file processing and current no-tracking scope', () => {
  assert.match(privacy, /not uploaded to an ExactSize server/i);
  assert.match(privacy, /does not include analytics, advertising, or tracking scripts/i);
  assert.match(privacy, /hosting provider/i);
});

test('Terms and About disclaim official affiliation and guaranteed acceptance', () => {
  const about = read('../src/pages/about.astro');
  assert.match(about, /not affiliated with government departments/i);
  assert.match(terms, /does not guarantee that an authority will accept/i);
});
