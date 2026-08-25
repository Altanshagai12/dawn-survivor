import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('upgrade choices use one fixed grid row height on every card', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.choice-list\s*\{[^}]*grid-auto-rows:\s*174px/);
  assert.match(css, /\.choice-card\s*\{[^}]*height:\s*100%/);
  assert.match(css, /\.choice-card__desc\s*\{[^}]*-webkit-line-clamp:\s*4/);
});
