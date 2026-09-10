import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSurvivalRecord } from '../src/ui/uiFormatters.js';

test('completed runs show the earned level in both languages; incomplete and legacy runs stay time-only', () => {
  assert.equal(formatSurvivalRecord(600_000, 32), '10:00 · Level 32');
  assert.equal(formatSurvivalRecord(600_000, 38, 'mn'), '10:00 · Түвшин 38');
  assert.equal(formatSurvivalRecord(599_999, 99), '09:59');
  for (const level of [undefined, null, NaN, Infinity, -1, 0, 2.5, '32']) {
    assert.equal(formatSurvivalRecord(600_000, level), '10:00');
  }
});
