import { BOSS_ATLASES, ENEMY_ATLASES } from '../config/assets.js?build=20260825r';
import { TEN_MINUTES_BALANCE } from '../config/balance.js?build=20260828i';
import { BOSSES, ENEMY_SPAWN_SESSIONS } from '../data/enemies.js?build=20260828i';
import { playDirectional } from './animations.js?build=20260828g';
import { attachGroundShadow } from './VisualEffects.js?build=20260825r';

export function rectangularEdgeSpawn(view, random = Math.random, minMargin = 36, maxMargin = 108) {
  const margin = minMargin + random() * (maxMargin - minMargin);
  const side = Math.floor(random() * 4);
  if (side === 0) return { x: view.x + random() * view.width, y: view.y - margin };
  if (side === 1) return { x: view.right + margin, y: view.y + random() * view.height };
  if (side === 2) return { x: view.x + random() * view.width, y: view.bottom + margin };
  return { x: view.x - margin, y: view.y + random() * view.height };
}

export function followedCameraView(player, camera) {
  const width = camera.width / (camera.zoom || 1);
  const height = camera.height / (camera.zoom || 1);
  return {
    x: player.x - width / 2, y: player.y - height / 2,
    right: player.x + width / 2, bottom: player.y + height / 2,
    width, height,
  };
}

export function shubArenaLayout(player, definition, random = Math.random) {
  const { startWidth, startHeight } = TEN_MINUTES_BALANCE.barrier;
  const clearance = 36;
  const distance = Math.max(72, Math.min(startWidth, startHeight) / 2 - definition.radius - clearance);
  const angle = random() * Math.PI * 2;
  const center = { x: player.x, y: player.y };
  return {
    center,
    boss: { x: center.x + Math.cos(angle) * distance, y: center.y + Math.sin(angle) * distance },
  };
}

export function enemySpawnSnapshot(definition, session, elapsed) {
  const hp = Math.max(1, Number(session?.hp ?? definition?.hp) || 0);
  return {
    hp,
    maxHp: hp,
    spawnSessionId: session?.id ?? null,
    spawnTime: Math.max(0, Number(elapsed) || 0),
  };
}

export class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.timers = new Map();
    this.startedSessions = new Set();
    this.spawnedBosses = new Set();
    this.nextId = 1;
  }

  update(deltaSeconds) {
    const elapsed = this.scene.state.elapsed;
    ENEMY_SPAWN_SESSIONS.forEach((session) => {
      if (elapsed < session.from || elapsed >= session.to) return;
      let timer = this.timers.get(session.id) || 0;
      if (!this.startedSessions.has(session.id)) {
        this.startedSessions.add(session.id);
        timer = session.interval;
      }
      timer += deltaSeconds;
      while (timer >= session.interval) {
        timer -= session.interval;
        this.spawnSessionWave(session);
      }
      this.timers.set(session.id, timer);
    });
    Object.values(BOSSES).forEach((boss) => {
      if (elapsed >= boss.spawnAt && !this.spawnedBosses.has(boss.id)) {
        this.spawnedBosses.add(boss.id);
        this.spawnBoss(boss);
      }
    });
  }

  spawnSessionWave(session) {
    const alive = this.scene.enemies.getChildren().filter(
      (enemy) => enemy?.active && enemy.spawnSessionId === session.id,
    ).length;
    const room = Math.min(session.count, session.maxAlive - alive,
      this.scene.performance.enemyCap - this.scene.enemies.countActive());
    for (let index = 0; index < room; index += 1) this.spawnEnemy(this.scene.enemyDefinitions[session.enemyId], null, session);
  }

  spawnPoint() {
    const { spawning } = TEN_MINUTES_BALANCE;
    const view = followedCameraView(this.scene.player, this.scene.cameras.main);
    let fallback = rectangularEdgeSpawn(view, Math.random, spawning.minOutsideMargin, spawning.maxOutsideMargin);
    for (let attempt = 0; attempt < spawning.retries; attempt += 1) {
      const point = rectangularEdgeSpawn(view, Math.random, spawning.minOutsideMargin, spawning.maxOutsideMargin);
      fallback = point;
      const clearOfTrees = this.scene.obstacles?.isSpawnClear?.(point, 54) ?? true;
      const insideBarrier = this.scene.barrier?.isSpawnPointAllowed?.(point) ?? true;
      if (clearOfTrees && insideBarrier) return point;
    }
    return fallback;
  }

  acquire(atlas, x, y, frame = 24) {
    let sprite = this.scene.enemies.get(x, y, atlas.key, frame);
    if (!sprite) return null;
    if (sprite.texture.key !== atlas.key) sprite.setTexture(atlas.key, frame);
    sprite.enableBody?.(true, x, y, true, true);
    sprite.setActive(true).setVisible(true).setPosition(x, y).setAlpha(1).clearTint();
    sprite.groundShadow?.setActive(true).setVisible(true);
    return sprite;
  }

  setupSprite(sprite, definition, atlas, snapshot) {
    const scale = definition.size / atlas.frameHeight;
    sprite.setScale(scale).setDepth(definition.boss ? 24 : 20).setDataEnabled();
    sprite.data?.reset?.();
    if (!sprite.groundShadow) attachGroundShadow(this.scene, sprite, {
      width: sprite.displayWidth * .66,
      height: definition.boss ? Math.max(12, sprite.displayWidth * .18) : 10,
      offsetY: sprite.displayHeight * .31,
      depth: definition.boss ? 23 : 19,
      alpha: .4,
    });
    sprite.spawnId = this.nextId++;
    sprite.spawnSessionId = snapshot.spawnSessionId;
    sprite.spawnTime = snapshot.spawnTime;
    sprite.enemyDef = definition;
    sprite.maxHp = snapshot.maxHp;
    sprite.hp = snapshot.hp;
    sprite.speed = definition.speed;
    sprite.dying = false;
    sprite.nextAttack = this.scene.time.now + 900 + Math.random() * 700;
    sprite.nextContactAt = 0;
    sprite.chargeUntil = 0;
    sprite.telegraphUntil = 0;
    sprite.chargePending = false;
    sprite.boomerExplodesAt = 0;
    sprite.boomerTell?.destroy();
    sprite.boomerTell = null;
    sprite.knockbackUntil = 0;
    sprite.status = { burnUntil: 0, burnTick: 0, freezeUntil: 0 };
    sprite.body.setSize(definition.radius * 2 / scale, definition.radius * 2 / scale, true);
    playDirectional(sprite, atlas.key, 0, 1, true);
    return sprite;
  }

  spawnEnemy(definition, point = null, session = null) {
    if (!definition) return null;
    const spawn = point || this.spawnPoint();
    const atlas = ENEMY_ATLASES[definition.id];
    const sprite = this.acquire(atlas, spawn.x, spawn.y);
    const snapshot = enemySpawnSnapshot(definition, session, this.scene.state?.elapsed);
    return sprite ? this.setupSprite(sprite, definition, atlas, snapshot) : null;
  }

  spawnBoss(definition) {
    let arena = null;
    let point = definition.id === 'shub' ? null : this.spawnPoint();
    if (definition.id === 'shub') {
      for (let attempt = 0; attempt < TEN_MINUTES_BALANCE.spawning.retries; attempt += 1) {
        const candidate = shubArenaLayout(this.scene.player, definition);
        arena = candidate;
        point = candidate.boss;
        if (this.scene.obstacles?.isSpawnClear?.(point, definition.radius + 18) ?? true) break;
      }
    }
    const atlas = BOSS_ATLASES[definition.id];
    const sprite = this.acquire(atlas, point.x, point.y);
    if (!sprite) { this.spawnedBosses.delete(definition.id); return null; }
    const bossDefinition = { ...definition, boss: true, xp: 0 };
    const snapshot = enemySpawnSnapshot(bossDefinition, null, this.scene.state?.elapsed);
    this.setupSprite(sprite, bossDefinition, atlas, snapshot);
    this.scene.activeBoss = sprite;
    if (arena) this.scene.barrier?.activate(arena.center.x, arena.center.y);
    this.scene.ui.toast(`${definition.name} approaches`, 2400);
    this.scene.cameras.main.shake(500, .006);
    return sprite;
  }

  releaseEnemy(enemy) {
    if (!enemy?.active) return;
    enemy.setVelocity(0, 0).disableBody?.(true, true);
    enemy.setActive(false).setVisible(false);
    enemy.groundShadow?.setActive(false).setVisible(false);
  }
}
