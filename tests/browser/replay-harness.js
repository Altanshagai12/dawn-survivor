import { BootScene } from '../../src/game/BootScene.js';
import { GameScene } from '../../src/game/GameScene.js';
import { singleFlight, startFreshRun } from '../../src/game/runLifecycle.js';
import { installVisibleResume } from '../../src/game/runtimeLifecycle.js';
import { UIController } from '../../src/ui/UIController.js';
import { createI18n } from '../../src/ui/i18n.js';
import { HEROES } from '../../src/data/heroes.js';
import { WEAPONS } from '../../src/data/weapons.js';
import { PREMIUM_SKINS } from '../../src/data/skins.js';
import { normalizeWeaponSkinProfile } from '../../src/data/weaponSkins.js';
import { DIRECTION_ROWS, HERO_ATLASES, WEAPONLESS_HERO_ATLASES } from '../../src/config/assets.js';
import { defaultProfile } from '../../src/platform/usion.js';
import { gameViewportSize, installAutoLandscape, requestLandscape } from '../../src/ui/orientation.js';
import { gameRenderResolution } from '../../src/game/deviceProfile.js';
import { installWeaponPosePreview } from './weapon-pose-preview.js';

if (location.hostname !== '127.0.0.1' && location.hostname !== 'localhost') {
  throw new Error('The regression harness only runs on localhost.');
}
const params = new URLSearchParams(location.search);
// Local fixture only: exercise the real CSS-rotation/input path in a desktop browser.
if (params.has('phone')) {
  const media = window.matchMedia.bind(window);
  window.matchMedia = (query) => query === '(pointer: coarse)'
    ? { matches: true, media: query, addEventListener() {}, removeEventListener() {} } : media(query);
}
const panel = document.createElement('aside');
panel.style.cssText = 'position:fixed;z-index:9999;top:0;left:0;max-height:70vh;overflow:auto;background:#fff;color:#000;padding:8px;width:96%;font:12px monospace';
const button = document.createElement('button');
button.textContent = 'Run weapon-skin replay suite';
button.style.cssText = 'background:#246;color:white;padding:8px';
const report = document.createElement('pre');
report.style.whiteSpace = 'pre-wrap';
panel.append(button, report);
if (!params.has('preview')) document.body.append(panel);
const logs = [];
const log = (message) => { logs.push(message); report.textContent = logs.join('\n'); };
addEventListener('error', (event) => log(`RUNTIME ERROR: ${event.error?.stack || event.message}`));
addEventListener('unhandledrejection', (event) => log(`REJECTION: ${event.reason?.stack || event.reason}`));
const profile = normalizeWeaponSkinProfile(defaultProfile());
const platform = { saveProfile: async () => {}, submitScore: async () => {}, friends: async () => [] };
const i18n = createI18n(params.get('lang') === 'mn' ? 'mn' : 'en');
const ui = new UIController({ heroes: HEROES, weapons: WEAPONS, profile, platform, i18n });
const syncOrientation = installAutoLandscape();
const viewport = gameViewportSize();
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', ...viewport,
  resolution: gameRenderResolution(window.devicePixelRatio, { ...viewport, coarse: matchMedia('(pointer: coarse)').matches }),
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
  scene: [BootScene, GameScene], render: { antialias: true, pixelArt: false, roundPixels: true },
});
installVisibleResume(game);
ui.onStart = singleFlight(async (selection) => {
  ui.setRunStartPending(true);
  try {
    await requestLandscape();
    syncOrientation();
    ui.showGame();
    startFreshRun(game.scene, selection);
  } finally {
    ui.setRunStartPending(false);
  }
});
game.registry.set('ui', ui);
game.registry.set('platform', platform);
game.registry.set('profile', profile);
game.registry.set('i18n', i18n);
if (params.has('pose')) installWeaponPosePreview({ game, ui, heroes: HEROES, weapons: WEAPONS, skins: PREMIUM_SKINS });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMoving(selection, label, replay = false) {
  const oldPlayer = game.scene.getScene('game').player;
  ui.selectedHero = selection.heroId;
  ui.selectedWeapon = selection.weaponId;
  profile.equippedWeaponSkins[selection.weaponId] = selection.skinId;
  if (!replay) ui.showMenu();
  document.getElementById(replay ? 'again-button' : 'start-button').click();
  const scene = game.scene.getScene('game');
  const deadline = performance.now() + 12000;
  while ((!scene.player?.active || scene.player === oldPlayer || !scene.sys.isActive()) && performance.now() < deadline) await wait(25);
  if (scene.player === oldPlayer || !scene.player?.active || !scene.sys.isActive()) throw new Error(`${label}: scene did not create`);
  const expectedAtlas = (selection.skinId ? WEAPONLESS_HERO_ATLASES : HERO_ATLASES)[selection.heroId];
  if (scene.player.texture.key !== expectedAtlas.key) throw new Error(`${label}: wrong original body variant`);
  if (Boolean(scene.weaponSkin?.weapon?.active) !== Boolean(selection.skinId)) throw new Error(`${label}: wrong attached gun count`);
  for (const direction of DIRECTION_ROWS) {
    const animation = scene.anims.get(`${expectedAtlas.key}-${direction}`);
    if (animation?.frames.length !== 6 || animation.frames.some(({ frame }) => !frame?.source?.image)) {
      throw new Error(`${label}: missing or stale body animation frames`);
    }
  }
  if ((scene.state.skin?.id || null) !== selection.skinId) throw new Error(`${label}: wrong weapon skin`);
  if (Object.values(PREMIUM_SKINS).some((skin) => scene.textures.exists(skin.heroAtlas.key))) throw new Error(`${label}: premium hero texture loaded`);
  scene.inputController.snapshot = () => ({ moveX: -1, moveY: 0, aimX: -1, aimY: 0, firing: true });
  const start = { elapsed: scene.state.elapsed, x: scene.player.x };
  const movementDeadline = performance.now() + 10000;
  while (scene.state.elapsed - start.elapsed < .25 && performance.now() < movementDeadline) await wait(50);
  const advanced = scene.state.elapsed - start.elapsed;
  const moved = Math.abs(scene.player.x - start.x);
  log(`${label}: elapsed +${advanced.toFixed(3)}s; moved ${moved.toFixed(1)}; loop=${game.loop.running}; paused=${game.isPaused}; scene=${scene.sys.settings.status}`);
  if (advanced < .1 || moved < 3) throw new Error(`${label}: timer/movement frozen`);
  await scene.endRun(false);
}

button.onclick = async () => {
  button.disabled = true;
  try {
    if (!game.scene.getScene('boot').sys.isActive()) throw new Error('Wait for the boot menu first');
    let index = 0;
    for (const skin of Object.values(PREMIUM_SKINS)) {
      const selection = { heroId: Object.keys(HEROES)[index++ % 4], weaponId: Object.keys(WEAPONS)[index % 4], skinId: skin.id };
      await runMoving(selection, `${skin.id} initial`);
      await runMoving(selection, `${skin.id} REPLAY`, true);
    }
    for (const heroId of Object.keys(HEROES)) {
      const selection = { heroId, weaponId: 'revolver', skinId: null };
      await runMoving(selection, `${heroId} original`);
      await runMoving(selection, `${heroId} original REPLAY`, true);
    }
    const first = Object.values(PREMIUM_SKINS)[0];
    await runMoving({ heroId: first.heroId, weaponId: 'shotgun', skinId: first.id }, 'First skin revisited');
    log('PASS: 25 runs. All eight weapon skins and four original heroes move/fire after PLAY AGAIN. Skin guns use the weaponless original body; original guns have no overlay. All body animation frames stay live.');
  } catch (error) {
    log(`FAIL: ${error.stack || error}`);
  } finally {
    button.disabled = false;
  }
};
log('Ready after the game menu loads. This fixture never submits leaderboard records.');
