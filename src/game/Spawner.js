import { BOSS_ATLASES, ENEMY_ATLASES } from '../config/assets.js';
import { BOSSES, availableEnemies } from '../data/enemies.js';
import { enemyHealthScale, spawnInterval, weightedPick } from './simulation.js';
import { playDirectional } from './animations.js';
import { attachGroundShadow, showSpawnWarning } from './VisualEffects.js';
import { attachWinglingFeedback } from './WinglingFeedback.js';

export function edgeSpawnOffsets(halfWidth, halfHeight, angle, distanceBoost = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const edgeDistance = Math.min(
    halfWidth / Math.max(.001, Math.abs(cos)),
    halfHeight / Math.max(.001, Math.abs(sin)),
  );
  return {
    x: cos * (edgeDistance + 115 + distanceBoost),
    y: sin * (edgeDistance + 115 + distanceBoost),
    warningX: cos * Math.max(42, edgeDistance - 46),
    warningY: sin * Math.max(42, edgeDistance - 46),
  };
}

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
    while (this.accumulator >= interval && this.scene.enemies.countActive() < this.scene.performance.enemyCap) {
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
    const angle = Math.random() * Math.PI * 2;
    const zoom = camera.zoom || 1;
    const halfWidth = camera.width / zoom / 2;
    const halfHeight = camera.height / zoom / 2;
    const offsets = edgeSpawnOffsets(halfWidth, halfHeight, angle, distanceBoost);
    return {
      x: this.scene.player.x + offsets.x,
      y: this.scene.player.y + offsets.y,
      warningX: this.scene.player.x + offsets.warningX,
      warningY: this.scene.player.y + offsets.warningY,
    };
  }

  spawnEnemy(definition, point = null) {
    const spawn = point || this.spawnPoint(definition.id === 'wingling' ? 90 : 0);
    const atlas = ENEMY_ATLASES[definition.id];
    const sprite = this.scene.enemies.create(spawn.x, spawn.y, atlas.key, 24);
    if (!sprite) return null;
    const scale = definition.size / atlas.frameHeight;
    sprite.setScale(scale).setDepth(20).setDataEnabled();
    attachGroundShadow(this.scene, sprite, {
      width: sprite.displayWidth * .64,
      offsetY: sprite.displayHeight * .3,
      depth: 19,
    });
    sprite.spawnId = this.nextId++;
    sprite.enemyDef = definition;
    sprite.maxHp = definition.hp * enemyHealthScale(this.scene.state.elapsed);
    sprite.hp = sprite.maxHp;
    sprite.speed = definition.speed * (1 + this.scene.state.elapsed / 1500);
    sprite.nextAttack = this.scene.time.now + 900 + Math.random() * 1200;
    sprite.status = { burnUntil: 0, burnTick: 0, freezeUntil: 0, curseUntil: 0, curseAt: 0 };
    if (definition.id === 'wingling') {
      const warningDuration = 900;
      sprite.spawnReadyAt = this.scene.time.now + warningDuration;
      sprite.spawnWarning = showSpawnWarning(
        this.scene,
        spawn.warningX ?? spawn.x,
        spawn.warningY ?? spawn.y,
        warningDuration,
      );
      attachWinglingFeedback(this.scene, sprite);
    }
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
    attachGroundShadow(this.scene, sprite, {
      width: sprite.displayWidth * .68,
      height: Math.max(12, sprite.displayWidth * .18),
      offsetY: sprite.displayHeight * .31,
      depth: 23,
      alpha: .42,
    });
    sprite.spawnId = this.nextId++;
    sprite.enemyDef = { ...definition, boss: true, xp: 0 };
    sprite.maxHp = definition.hp;
    sprite.hp = definition.hp;
    sprite.speed = definition.speed;
    sprite.nextAttack = this.scene.time.now + 1800;
    sprite.status = { burnUntil: 0, burnTick: 0, freezeUntil: 0, curseUntil: 0, curseAt: 0 };
    sprite.body.setSize(definition.radius * 2 / scale, definition.radius * 2 / scale, true);
    playDirectional(sprite, atlas.key, 0, 1, true);
    this.scene.activeBoss = sprite;
    this.scene.ui.toast(`${definition.name} approaches`, 2400);
    this.scene.cameras.main.shake(500, .006);
    return sprite;
  }
}
