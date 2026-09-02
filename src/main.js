import { HEROES } from './data/heroes.js?build=20260828i';
import { normalizeSkinProfile, SKIN_ACCESS_MODE } from './data/skins.js?build=20260901e';
import { WEAPONS } from './data/weapons.js?build=20260827b';
import { BootScene } from './game/BootScene.js?build=20260901g';
import { GameScene } from './game/GameScene.js?build=20260902a';
import { gameRenderResolution } from './game/deviceProfile.js?build=20260901f';
import { installVisibleResume } from './game/runtimeLifecycle.js?build=20260825r';
import { singleFlight, startFreshRun } from './game/runLifecycle.js?build=20260901i';
import { defaultProfile, initPlatform } from './platform/usion.js?build=20260828a';
import { createI18n } from './ui/i18n.js?build=20260826l';
import { installInteractionGuards } from './ui/interactionGuards.js?build=20260826h';
import { UIController } from './ui/UIController.js?build=20260901i';
import { gameViewportSize, installAutoLandscape, requestLandscape } from './ui/orientation.js?build=20260826b';

async function boot() {
  installInteractionGuards();
  const syncOrientation = installAutoLandscape();
  const platform = await initPlatform();
  const stored = await platform.loadProfile();
  const profile = normalizeSkinProfile({ ...defaultProfile(), ...(stored || {}) });
  let commerce = null;
  if (SKIN_ACCESS_MODE === 'paid') {
    const { SkinCommerce } = await import('./commerce/SkinCommerce.js?build=20260901b');
    commerce = new SkinCommerce({ platform, profile });
    await commerce.recoverPending().catch((error) => console.warn('Skin delivery recovery pending', error));
  }
  const i18n = createI18n(platform.config.language);
  const ui = new UIController({ heroes: HEROES, weapons: WEAPONS, i18n, profile, platform, commerce });

  const viewport = gameViewportSize();
  const renderProfile = {
    coarse: matchMedia('(pointer: coarse)').matches,
    width: viewport.width,
    cores: navigator.hardwareConcurrency || 8,
    memory: navigator.deviceMemory || 8,
  };
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    resolution: gameRenderResolution(window.devicePixelRatio, renderProfile),
    backgroundColor: '#09080d',
    render: { antialias: true, pixelArt: false, roundPixels: true },
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

  ui.onStart = singleFlight(async (selection) => {
    ui.setRunStartPending(true);
    try {
      await requestLandscape();
      syncOrientation();
      resizeGame();
      profile.selectedHero = selection.heroId;
      profile.selectedWeapon = selection.weaponId;
      ui.showGame();
      startFreshRun(game.scene, selection);
      void platform.saveProfile(profile).catch((error) => console.warn('Profile save pending', error));
    } finally {
      ui.setRunStartPending(false);
    }
  });
  platform.releaseBack();
}

boot().catch((error) => {
  console.error(error);
  document.getElementById('boot').innerHTML = '<p>Unable to start Dawn Survivor.</p>';
});
