import { HEROES } from './data/heroes.js?build=20260826e';
import { WEAPONS } from './data/weapons.js?build=20260826d';
import { BootScene } from './game/BootScene.js?build=20260825r';
import { GameScene } from './game/GameScene.js?build=20260826i';
import { installVisibleResume } from './game/runtimeLifecycle.js?build=20260825r';
import { defaultProfile, initPlatform } from './platform/usion.js?build=20260825r';
import { createI18n } from './ui/i18n.js?build=20260825r';
import { installInteractionGuards } from './ui/interactionGuards.js?build=20260826h';
import { UIController } from './ui/UIController.js?build=20260826e';
import { gameViewportSize, installAutoLandscape, requestLandscape } from './ui/orientation.js?build=20260826b';

async function boot() {
  installInteractionGuards();
  const syncOrientation = installAutoLandscape();
  const platform = await initPlatform();
  const stored = await platform.loadProfile();
  const profile = { ...defaultProfile(), ...(stored || {}) };
  const i18n = createI18n(platform.config.language);
  const ui = new UIController({ heroes: HEROES, weapons: WEAPONS, i18n, profile });

  const viewport = gameViewportSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#09080d',
    render: { antialias: false, pixelArt: true, roundPixels: true },
    scale: { mode: Phaser.Scale.NONE, width: viewport.width, height: viewport.height },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: [BootScene, GameScene],
    fps: { target: 60, min: 30, smoothStep: true, forceSetTimeOut: false },
  });
  installVisibleResume(game);
  const resizeGame = () => {
    const next = gameViewportSize();
    if (game.scale.width !== next.width || game.scale.height !== next.height) {
      game.scale.resize(next.width, next.height);
    }
  };
  addEventListener('resize', resizeGame, { passive: true });
  addEventListener('orientationchange', resizeGame, { passive: true });

  game.registry.set('platform', platform);
  game.registry.set('profile', profile);
  game.registry.set('ui', ui);
  game.registry.set('i18n', i18n);

  ui.onStart = async (selection) => {
    await requestLandscape();
    syncOrientation();
    resizeGame();
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
