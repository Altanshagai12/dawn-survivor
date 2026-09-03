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

test('loadout groups four original heroes on the left and four weapon carousels in a two by two grid', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../loadout.css', import.meta.url), 'utf8');
  assert.ok(html.indexOf('id="hero-list"') < html.indexOf('id="weapon-list"'));
  assert.match(css, /#menu\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*justify-content:\s*stretch/);
  assert.match(css, /\.loadout-selection\s*\{[^}]*grid-template-columns:\s*minmax\(180px,\s*\.68fr\)\s*minmax\(0,\s*2fr\)/);
  assert.match(css, /\.hero-rail\s*\{[^}]*grid-template-rows:\s*repeat\(4,/);
  assert.match(css, /\.weapon-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,[^}]*grid-template-rows:\s*repeat\(2,/);
  assert.match(css, /\.weapon-stage img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(css, /\.weapon-stage\s*\{[^}]*touch-action:\s*none/);
  assert.doesNotMatch(html, /id="skin-(?:list|modal|preview)"/);
});

test('hero rail and weapon grid share heading geometry without extra loadout text', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../loadout.css', import.meta.url), 'utf8');
  const controller = await readFile(new URL('../src/ui/WeaponLoadoutController.js', import.meta.url), 'utf8');
  assert.match(css, /\.loadout-heroes, \.loadout-weapons\s*\{[^}]*grid-template-rows:\s*14px minmax\(0, 1fr\);[^}]*gap:\s*12px/);
  assert.match(css, /\.hero-rail\s*\{[^}]*border:\s*1px solid/);
  assert.doesNotMatch(css, /\.loadout-(?:heroes|weapons)\s*\{[^}]*padding/);
  assert.doesNotMatch(html, /loadout-summary|loadout-hint|hero-note|movement-description|SKIN \/ VFX \/ AUDIO|01 — 04/);
  assert.doesNotMatch(controller, /skin-count|skin-kind|SPD|hero-stat|weapon-stat|movementCopy/);
});

test('hero ability copy remains readable and wraps instead of disappearing on mobile', async () => {
  const css = await readFile(new URL('../loadout.css', import.meta.url), 'utf8');
  assert.match(css, /\.hero-option__ability\s*\{[^}]*white-space:\s*normal/);
  assert.match(css, /\.hero-option__ability\s*\{[^}]*font-size:\s*10\.5px/);
  assert.doesNotMatch(css, /\.hero-option__ability\s*\{[^}]*(?:display:\s*none|visibility:\s*hidden|opacity:\s*0|text-overflow:\s*ellipsis)/);
});
