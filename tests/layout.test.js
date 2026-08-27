import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('upgrade choices use five equal icon tabs above one stable detail panel', async () => {
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.choice-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--choice-count,\s*5\),/);
  assert.match(css, /\.choice-tab\s*\{[^}]*aspect-ratio:\s*1/);
  assert.match(css, /\.choice-tab\s*\{[^}]*margin:\s*0/);
  assert.match(css, /\.choice-tab\s*\{[^}]*border:\s*0[^}]*background:\s*transparent[^}]*clip-path:\s*none/);
  assert.match(css, /\.choice-tab\.selected\s*\{[^}]*background:\s*transparent[^}]*filter:\s*none/);
  assert.match(css, /\.choice-tab\.selected \.choice-card__icon--atlas\s*\{[^}]*box-shadow:\s*inset/);
  assert.doesNotMatch(css, /\.choice-tab\.selected\s*\{[^}]*drop-shadow/);
  assert.match(css, /\.choice-actions button\s*\{[^}]*margin:\s*0/);
  assert.doesNotMatch(css, /\.modal__panel\s+button\s*\+\s*button/);
  assert.match(css, /\.choice-detail\s*\{[^}]*min-height:\s*188px/);
});

test('loadout keeps heroes above weapons with four equal image cards per row', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.ok(html.indexOf('id="hero-list"') < html.indexOf('id="weapon-list"'));
  assert.match(css, /\.selection\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.card-strip\s*\{[^}]*grid-template-columns:\s*repeat\(4,/);
  assert.match(css, /html\.mobile-rotated \.selection\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.weapon-art\s*\{[^}]*object-fit:\s*contain/);
});
