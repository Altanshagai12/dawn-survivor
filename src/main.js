import { HEROES } from './data/heroes.js?build=20260825g';
import { WEAPONS } from './data/weapons.js';
import { BootScene } from './game/BootScene.js?build=20260825l';
import { GameScene } from './game/GameScene.js?build=20260825g';
import { installVisibleResume } from './game/runtimeLifecycle.js';
import { defaultProfile, initPlatform } from './platform/usion.js';
import { createI18n } from './ui/i18n.js';
import { UIController } from './ui/UIController.js?build=20260825i';

async function boot() {
  const platform = await initPlatform();
  const stored = await platform.loadProfile();
  const profile = { ...defaultProfile(), ...(stored || {}) };
  const i18n = createI18n(platform.config.language);
  const ui = new UIController({ heroes: HEROES, weapons: WEAPONS, i18n, profile });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#09080d',
    render: { antialias: false, pixelArt: true, roundPixels: true },
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [BootScene, GameScene],
    fps: { target: 60, min: 30, smoothStep: true, forceSetTimeOut: false },
  });
  installVisibleResume(game);

  game.registry.set('platform', platform);
  game.registry.set('profile', profile);
  game.registry.set('ui', ui);
  game.registry.set('i18n', i18n);

  ui.onStart = async (selection) => {
    profile.selectedHero = selection.heroId;
    profile.selectedWeapon = selection.weaponId;
    await platform.saveProfile(profile);
    ui.showGame();
    game.scene.start('game', selection);
  };
  platform.releaseBack();
}

boot().catch((error) => {
  console.error(error);
  document.getElementById('boot').innerHTML = '<p>Unable to start Dawn Survivor.</p>';
});
