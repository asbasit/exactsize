import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectPassportFile } from '../src/lib/passportPreflight.js';

const rules = JSON.parse(await readFile(new URL('../src/data/passportRules.json', import.meta.url), 'utf8'));
const mode = (countryCode, modeId) => rules.countries.find((country) => country.code === countryCode)?.modes.find((item) => item.id === modeId);

function check(result, field) {
  return result.checks.find((item) => item.field === field);
}

test('New Zealand online checks listed format, pixel bounds and exact ratio, but leaves byte conversion manual', () => {
  const result = inspectPassportFile({ name: 'photo.JPG', type: 'image/jpeg', sizeBytes: 400000, widthPx: 1200, heightPx: 1600 }, mode('NZ', 'online-application'));
  assert.equal(result.status, 'partial');
  assert.equal(check(result, 'format').status, 'matches');
  assert.equal(check(result, 'dimensions').status, 'matches');
  assert.equal(check(result, 'aspectRatio').status, 'matches');
  assert.equal(check(result, 'fileSize').status, 'manualReview');
  assert.equal(check(result, 'fileSize').actualBytes, 400000);
  assert.match(check(result, 'fileSize').message, /no pass\/fail/i);
});

test('New Zealand flags an unsupported extension and an out-of-range image without modifying it', () => {
  const info = Object.freeze({ name: 'photo.png', type: 'image/png', sizeBytes: 9000000, widthPx: 4501, heightPx: 6001 });
  const before = { ...info };
  const result = inspectPassportFile(info, mode('NZ', 'online-application'));
  assert.equal(result.status, 'needsReview');
  assert.equal(check(result, 'format').status, 'outside');
  assert.equal(check(result, 'dimensions').status, 'outside');
  assert.equal(check(result, 'aspectRatio').status, 'outside');
  assert.deepEqual(info, before);
  assert.equal('blob' in result, false);
  assert.equal('output' in result, false);
});

test('Canada checks both pixel bounds and portrait ratio', () => {
  const canada = mode('CA', 'eligible-online-adult-renewal');
  const within = inspectPassportFile({ name: 'photo.jpeg', sizeBytes: 700000, widthPx: 1200, heightPx: 1800 }, canada);
  assert.equal(check(within, 'dimensions').status, 'matches');
  assert.equal(check(within, 'aspectRatio').status, 'matches');
  const aboveMax = inspectPassportFile({ name: 'photo.jpeg', sizeBytes: 700000, widthPx: 3001, heightPx: 4500 }, canada);
  assert.equal(check(aboveMax, 'dimensions').status, 'outside');
});

test('UK checks its published minimum pixels while format and upper dimensions stay unspecified', () => {
  const result = inspectPassportFile({ name: 'photo.png', type: 'image/png', sizeBytes: 300000, widthPx: 600, heightPx: 750 }, mode('GB', 'online-application'));
  assert.equal(check(result, 'dimensions').status, 'matches');
  assert.equal(check(result, 'format').status, 'notSpecified');
  assert.equal(check(result, 'aspectRatio').status, 'notSpecified');
  const tooSmall = inspectPassportFile({ name: 'photo.png', sizeBytes: 300000, widthPx: 599, heightPx: 749 }, mode('GB', 'online-application'));
  assert.equal(check(tooSmall, 'dimensions').status, 'outside');
});

test('US online renewal checks only a listed extension and does not invent pixel rules', () => {
  const result = inspectPassportFile({ name: 'photo.HEIF', type: 'image/heif', sizeBytes: 200000, widthPx: 1200, heightPx: 1600 }, mode('US', 'eligible-online-adult-renewal'));
  assert.equal(check(result, 'format').status, 'matches');
  assert.equal(check(result, 'dimensions').status, 'notSpecified');
  assert.equal(check(result, 'aspectRatio').status, 'notSpecified');
  assert.equal(check(result, 'fileSize').status, 'manualReview');
});

test('India overseas pathway is not automatically checked when the upload route is pathway-dependent', () => {
  const result = inspectPassportFile({ name: 'photo.jpg', sizeBytes: 200000, widthPx: 630, heightPx: 810 }, mode('IN', 'overseas-icao-guidance'));
  assert.equal(result.status, 'pathwayDependent');
  assert.equal(result.checks.length, 0);
});

test('Australia print-photo mode does not expose a digital file check', () => {
  const result = inspectPassportFile({ name: 'photo.jpg', sizeBytes: 200000, widthPx: 600, heightPx: 800 }, mode('AU', 'passport-application-print-photos'));
  assert.equal(result.status, 'notApplicable');
  assert.equal(result.checks.length, 0);
});

test('unreadable pixel dimensions remain unverified instead of being treated as a failure', () => {
  const result = inspectPassportFile({ name: 'photo.jpg', sizeBytes: 300000 }, mode('NZ', 'online-application'));
  assert.equal(check(result, 'dimensions').status, 'notCheckable');
  assert.equal(check(result, 'aspectRatio').status, 'notCheckable');
});
