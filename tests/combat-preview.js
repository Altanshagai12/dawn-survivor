import { BootScene } from '../src/game/BootScene.js';
import { GameScene } from '../src/game/GameScene.js';
import { BOSSES, ENEMIES } from '../src/data/enemies.js';
import { gameRenderResolution } from '../src/game/deviceProfile.js';
import { gameViewportSize, installAutoLandscape } from '../src/ui/orientation.js';
import { startFreshRun } from '../src/game/runLifecycle.js';

if (!['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) {
  throw new Error('This fixture is available only on localhost.');
}
const query = new URLSearchParams(location.search);
if (query.has('phone')) {
  const nativeMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (value) => value === '(pointer: coarse)'
    ? { ...nativeMatchMedia(value), matches: true, media: value }
    : nativeMatchMedia(value);
}
installAutoLandscape();
let errorCount = 0;
const showError = (error) => {
  errorCount += 1;
  document.getElementById('errors').textContent = `Errors: ${errorCount}\n${error?.stack || error}`;
};
addEventListener('error', (event) => showError(event.error || event.message));
addEventListener('unhandledrejection', (event) => showError(event.reason));
let message = 'All four summons enabled · WASD + mouse or touch sticks';
let current = null;
let replayCount = 0;
const selection = { heroId: 'shana', weaponId: 'revolver', skinId: null };

function spawnWave() {
  if (!current || current.ended) return;
  for (let index = 0; index < 9; index += 1) {
    const angle = index / 9 * Math.PI * 2;
    current.spawner.spawnEnemy(ENEMIES.tentacle, {
      x: current.player.x + Math.cos(angle) * 260,
      y: current.player.y + Math.sin(angle) * 220,
    });
  }
}

class PreviewGameScene extends GameScene {
  create() {
    super.create();
    current = this;
    Object.assign(this.state.flags, {
      ghostFriend: true, magicDagger: true, magicScythe: true, electroBug: true,
    });
    spawnWave();
  }
}

const ui = {
  showMenu() { game.scene.start('game', selection); },
  showGame() { message = 'All four summons enabled · WASD + mouse or touch sticks'; },
  updateHud() {}, showBoss() {},
  showPause() { message = 'Paused'; }, hidePause() { message = 'Running'; },
  toast(value) { message = value; },
  showResult(result) { message = `Run ended at ${result.elapsed.toFixed(1)}s · Replay to restart`; },
  choose(cards) { return Promise.resolve({ card: cards[0] }); },
};
// Local stubs: no SDK, score submission, ownership lookup, or payment requests.
const platform = {
  async saveProfile() {}, async submitScore() {}, async friends() { return []; },
};
const viewport = gameViewportSize();
const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#09080d',
  resolution: gameRenderResolution(devicePixelRatio, {
    coarse: matchMedia('(pointer: coarse)').matches, width: viewport.width,
    cores: navigator.hardwareConcurrency || 8, memory: navigator.deviceMemory || 8,
  }),
  render: { antialias: true, pixelArt: false, roundPixels: true },
  scale: { mode: Phaser.Scale.NONE, width: viewport.width, height: viewport.height },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: [BootScene, PreviewGameScene],
  fps: { target: 60, min: 30, smoothStep: true, forceSetTimeOut: false },
});
game.registry.set('ui', ui);
game.registry.set('platform', platform);
game.registry.set('profile', { runs: 0, wins: 0, totalKills: 0 });
addEventListener('resize', () => {
  const next = gameViewportSize();
  game.scale.resize(next.width, next.height);
});
document.getElementById('wave').onclick = spawnWave;
document.getElementById('boss').onclick = () => {
  if (current && !current.ended && !current.activeBoss?.active) current.spawner.spawnBoss(BOSSES.shub);
};
document.getElementById('pause').onclick = () => current?.pauseRun();
document.getElementById('resume').onclick = () => current?.resumeRun();
document.getElementById('replay').onclick = () => {
  replayCount += 1;
  startFreshRun(game.scene, selection);
};
setInterval(() => {
  if (!current?.state) return;
  const boss = current.activeBoss;
  const phase = !boss?.active ? 'none' : boss.chargeUntil > current.time.now ? 'CHARGING'
    : boss.chargePending ? 'windup' : 'chase';
  const live = (group) => group.getChildren().filter((node) => node.active).length;
  document.getElementById('stats').textContent = [
    `Time ${current.state.elapsed.toFixed(1)}s · LV ${current.state.level} · Kills ${current.state.kills} · HP ${current.state.hp}`,
    `Enemies ${live(current.enemies)} · Bullets ${live(current.bullets)} · Replays ${replayCount} · Boss ${phase}`,
    `Position ${current.player.x.toFixed(0)}, ${current.player.y.toFixed(0)} · ${game.scale.width}×${game.scale.height} · ${message}`,
  ].join('\n');
}, 100);
