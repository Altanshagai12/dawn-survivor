import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('upgrade choices use five equal icon tabs above one stable detail panel', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.choice-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(5,/);
  assert.match(css, /\.choice-tab\s*\{[^}]*aspect-ratio:\s*1/);
  assert.match(css, /\.choice-detail\s*\{[^}]*min-height:\s*188px/);
});
