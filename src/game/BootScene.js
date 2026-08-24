import { BOSS_ATLASES, ENEMY_ATLASES, HERO_ATLASES, STATIC_ASSETS } from '../config/assets.js';
import { createDirectionalAnimations } from './animations.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload() {
    for (const atlas of Object.values({ ...HERO_ATLASES, ...ENEMY_ATLASES, ...BOSS_ATLASES })) {
      this.load.spritesheet(atlas.key, atlas.file, { frameWidth: atlas.frameWidth, frameHeight: atlas.frameHeight });
    }
    this.load.image('ashen-map', STATIC_ASSETS.map);
    this.load.image('spirit-raven', STATIC_ASSETS.spirit);
    this.load.spritesheet('combat-vfx', STATIC_ASSETS.vfx, { frameWidth: 181, frameHeight: 181 });
  }

  create() {
    Object.values(HERO_ATLASES).forEach((atlas) => createDirectionalAnimations(this, atlas, 11));
    Object.values(ENEMY_ATLASES).forEach((atlas) => createDirectionalAnimations(this, atlas, 9));
    Object.values(BOSS_ATLASES).forEach((atlas) => createDirectionalAnimations(this, atlas, 8));
    for (let row = 0; row < 8; row += 1) {
      this.anims.create({
        key: `combat-vfx-${row}`,
        frames: this.anims.generateFrameNumbers('combat-vfx', { start: row * 6, end: row * 6 + 5 }),
        frameRate: 16,
        repeat: 0,
        hideOnComplete: true,
      });
    }
    const ui = this.game.registry.get('ui');
    ui.showMenu();
  }
}
