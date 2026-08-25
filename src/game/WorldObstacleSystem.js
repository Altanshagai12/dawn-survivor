import { attachGroundShadow, syncGroundShadow } from './VisualEffects.js';
import { DAMAGE_SOURCE } from './EnemySystem.js?build=20260825g';

export const TREE_CONTACT_DAMAGE = 1;
export const TREE_ATTACKS = false;
export const TREE_IDLE_FRAME = 0;
export const TREE_ROOT_ORIGIN = .925;
export const TREE_CONTACT_EXIT_GRACE_MS = 120;
export const TREE_COLLIDER = Object.freeze({ width: 48, height: 20 });
export const TREE_CHUNK_SIZE = 680;
export const TREE_SAFE_START_RADIUS = 420;
export const TREE_MIN_SPACING = 360;
const TREE_MARGIN = 190;

function hash(value) {
  let result = value | 0;
  result = Math.imul(result ^ result >>> 16, 0x45d9f3b);
  result = Math.imul(result ^ result >>> 16, 0x45d9f3b);
  return (result ^ result >>> 16) >>> 0;
}

export function chunkTreePoints(chunkX, chunkY) {
  const seed = hash(chunkX * 73856093 ^ chunkY * 19349663);
  if (seed % 100 >= 84) return [];
  const xHash = hash(seed ^ 0x68bc21eb);
  const yHash = hash(seed ^ 0x02e5be93);
  const localSpan = TREE_CHUNK_SIZE - TREE_MARGIN * 2;
  const point = {
    x: chunkX * TREE_CHUNK_SIZE + TREE_MARGIN + xHash % (localSpan + 1),
    y: chunkY * TREE_CHUNK_SIZE + TREE_MARGIN + yHash % (localSpan + 1),
  };
  return Math.hypot(point.x, point.y) > TREE_SAFE_START_RADIUS ? [point] : [];
}

export class WorldObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.loadedChunks = new Set();
    this.chunkRadius = scene.performance?.treeChunkRadius || 2;
    this.treeCap = scene.performance?.treeCap || 145;
    this.trees = scene.physics.add.staticGroup({ maxSize: this.treeCap + 4 });
    scene.trees = this.trees;
    scene.physics.add.collider(scene.player, this.trees, (_player, tree) => this.touchTree(tree));
    scene.physics.add.overlap(scene.bullets, this.trees, (bullet, tree) => this.hitTree(bullet, tree));
    this.update();
  }

  update() {
    const chunkX = Math.floor(this.scene.player.x / TREE_CHUNK_SIZE);
    const chunkY = Math.floor(this.scene.player.y / TREE_CHUNK_SIZE);
    for (let y = chunkY - this.chunkRadius; y <= chunkY + this.chunkRadius; y += 1) {
      for (let x = chunkX - this.chunkRadius; x <= chunkX + this.chunkRadius; x += 1) this.loadChunk(x, y);
    }
    this.trees.getChildren().forEach((tree) => {
      if (!tree?.active) return;
      if (Math.abs(tree.chunkX - chunkX) > 3 || Math.abs(tree.chunkY - chunkY) > 3) {
        this.loadedChunks.delete(`${tree.chunkX}:${tree.chunkY}`);
        tree.destroy();
        return;
      }
      tree.setFrame(TREE_IDLE_FRAME);
      tree.setDepth(tree.y > this.scene.player.y ? 27 : 17);
      if (tree.contactLatched
        && this.scene.time.now - tree.lastContactAt > TREE_CONTACT_EXIT_GRACE_MS) {
        tree.contactLatched = false;
      }
      syncGroundShadow(tree);
    });
  }

  loadChunk(chunkX, chunkY) {
    const key = `${chunkX}:${chunkY}`;
    if (this.loadedChunks.has(key) || this.trees.countActive() >= this.treeCap) return;
    this.loadedChunks.add(key);
    chunkTreePoints(chunkX, chunkY).forEach(({ x, y }) => this.spawnTree(x, y, chunkX, chunkY));
  }

  spawnTree(x, y, chunkX, chunkY) {
    const tree = this.trees.create(x, y, 'mysterious-tree', TREE_IDLE_FRAME);
    if (!tree) return;
    tree.setOrigin(.5, TREE_ROOT_ORIGIN).setScale(.43).setDepth(17);
    tree.refreshBody();
    tree.body.setSize(TREE_COLLIDER.width, TREE_COLLIDER.height, true);
    tree.hp = 45000;
    tree.chunkX = chunkX;
    tree.chunkY = chunkY;
    tree.contactLatched = false;
    tree.lastContactAt = Number.NEGATIVE_INFINITY;
    attachGroundShadow(this.scene, tree, {
      width: 58, height: 10, offsetY: 0, depth: 16, alpha: .32,
    });
  }

  touchTree(tree) {
    if (!tree?.active) return;
    tree.lastContactAt = this.scene.time.now;
    if (tree.contactLatched) return;
    tree.contactLatched = true;
    this.scene.enemySystem.damagePlayer(TREE_CONTACT_DAMAGE, DAMAGE_SOURCE.TREE);
  }

  hitTree(bullet, tree) {
    if (!bullet?.active || !tree?.active) return;
    tree.hp -= bullet.damage || 1;
    this.scene.flashEffect(bullet.x, bullet.y, 1, .2);
    bullet.destroy();
    if (tree.hp <= 0) tree.destroy();
  }
}
