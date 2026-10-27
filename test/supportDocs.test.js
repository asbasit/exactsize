import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routes = JSON.parse(readFileSync(new URL('../public/manus-routes.json', import.meta.url), 'utf8')).routes;
const routePaths = new Set(routes.map((route) => route.path));
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const base = read('../src/layouts/Base.astro');
const faq = read('../src/pages/faq.astro');
const help = read('../src/pages/help.astro');

test('FAQ and Help pages are registered and linked from the shared footer', () => {
  for (const path of ['/faq/', '/help/']) {
    assert.ok(routePaths.has(path), `${path} is missing from the route manifest`);
    assert.ok(base.includes(`href="${path}"`), `${path} is missing from the footer`);
  }
});

test('FAQ page covers privacy, limits, and routes users to human support', () => {
  assert.match(faq, /does not upload your image file/i);
  assert.match(faq, /preflight result guarantee acceptance/i);
  assert.match(faq, /href="\/contact\/"/);
  assert.match(faq, /FAQPage/);
});

test('Help page includes practical troubleshooting and privacy/contact links', () => {
  assert.match(help, /The image will not open/i);
  assert.match(help, /result is still too large/i);
  assert.match(help, /href="\/contact\/"/);
  assert.match(help, /href="\/privacy\/"/);
  assert.match(help, /Please do not send passport photos/i);
});
