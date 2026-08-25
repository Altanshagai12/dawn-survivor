import { HEROES } from './data/heroes.js?build=20260825r';
import { WEAPONS } from './data/weapons.js?build=20260825r';
import { BootScene } from './game/BootScene.js?build=20260825r';
import { GameScene } from './game/GameScene.js?build=20260825r';
import { installVisibleResume } from './game/runtimeLifecycle.js?build=20260825r';
import { defaultProfile, initPlatform } from './platform/usion.js?build=20260825r';
import { createI18n } from './ui/i18n.js?build=20260825r';
import { UIController } from './ui/UIController.js?build=20260825r';
import { installOrientationGate, requestLandscape } from './ui/orientation.js?build=20260825r';

async function boot() {
  installOrientationGate();
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
    await requestLandscape();
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
