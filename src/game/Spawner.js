import { BOSS_ATLASES, ENEMY_ATLASES } from '../config/assets.js';
import { BOSSES, MAX_LIVE_ENEMIES, availableEnemies } from '../data/enemies.js';
import { enemyHealthScale, spawnInterval, weightedPick } from './simulation.js';
import { playDirectional } from './animations.js';

export class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.accumulator = 0;
    this.spawnedBosses = new Set();
    this.nextId = 1;
  }

  update(deltaSeconds) {
    const elapsed = this.scene.state.elapsed;
    this.accumulator += deltaSeconds;
    const interval = spawnInterval(elapsed);
    while (this.accumulator >= interval && this.scene.enemies.countActive() < MAX_LIVE_ENEMIES) {
      this.accumulator -= interval;
      const definition = weightedPick(availableEnemies(elapsed));
      this.spawnEnemy(definition);
      if (elapsed > 480 && Math.random() < .25) this.spawnEnemy(weightedPick(availableEnemies(elapsed)));
    }
    for (const boss of Object.values(BOSSES)) {
      if (elapsed >= boss.spawnAt && !this.spawnedBosses.has(boss.id)) {
        this.spawnedBosses.add(boss.id);
        this.spawnBoss(boss);
      }
    }
  }

  spawnPoint(distanceBoost = 0) {
    const camera = this.scene.cameras.main;
    const radius = Math.max(camera.width, camera.height) * .65 + 130 + distanceBoost;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: this.scene.player.x + Math.cos(angle) * radius,
      y: this.scene.player.y + Math.sin(angle) * radius,
    };
  }

  spawnEnemy(definition, point = this.spawnPoint()) {
    const atlas = ENEMY_ATLASES[definition.id];
    const sprite = this.scene.enemies.create(point.x, point.y, atlas.key, 24);
    if (!sprite) return null;
    const scale = definition.size / atlas.frameHeight;
    sprite.setScale(scale).setDepth(20).setDataEnabled();
    sprite.spawnId = this.nextId++;
    sprite.enemyDef = definition;
    sprite.maxHp = definition.hp * enemyHealthScale(this.scene.state.elapsed);
    sprite.hp = sprite.maxHp;
    sprite.speed = definition.speed * (1 + this.scene.state.elapsed / 1500);
    sprite.nextAttack = this.scene.time.now + 900 + Math.random() * 1200;
    sprite.status = { burnUntil: 0, burnTick: 0, freezeUntil: 0 };
    sprite.body.setSize(definition.radius * 2 / scale, definition.radius * 2 / scale, true);
    playDirectional(sprite, atlas.key, 0, 1, true);
    return sprite;
  }

  spawnBoss(definition) {
    const point = this.spawnPoint(100);
    const atlas = BOSS_ATLASES[definition.id];
    const sprite = this.scene.enemies.create(point.x, point.y, atlas.key, 24);
    if (!sprite) {
      this.spawnedBosses.delete(definition.id);
      return null;
    }
    const scale = definition.size / atlas.frameHeight;
    sprite.setScale(scale).setDepth(24).setDataEnabled();
    sprite.spawnId = this.nextId++;
    sprite.enemyDef = { ...definition, boss: true, xp: 0 };
    sprite.maxHp = definition.hp;
    sprite.hp = definition.hp;
    sprite.speed = definition.speed;
    sprite.nextAttack = this.scene.time.now + 1800;
    sprite.status = { burnUntil: 0, burnTick: 0, freezeUntil: 0 };
    sprite.body.setSize(definition.radius * 2 / scale, definition.radius * 2 / scale, true);
    playDirectional(sprite, atlas.key, 0, 1, true);
    this.scene.activeBoss = sprite;
    this.scene.ui.toast(`${definition.name} approaches`, 2400);
    this.scene.cameras.main.shake(500, .006);
    return sprite;
  }
}
