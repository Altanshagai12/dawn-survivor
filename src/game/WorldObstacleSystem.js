import { attachGroundShadow, syncGroundShadow } from './VisualEffects.js';

export const TREE_CONTACT_DAMAGE = 1;
const CHUNK_SIZE = 620;

function hash(value) {
  let result = value | 0;
  result = Math.imul(result ^ result >>> 16, 0x45d9f3b);
  result = Math.imul(result ^ result >>> 16, 0x45d9f3b);
  return (result ^ result >>> 16) >>> 0;
}

export function chunkTreePoints(chunkX, chunkY) {
  const seed = hash(chunkX * 73856093 ^ chunkY * 19349663);
  const count = 1 + seed % 2;
  return Array.from({ length: count }, (_, index) => {
    const local = hash(seed + index * 83492791);
    return {
      x: chunkX * CHUNK_SIZE + 95 + local % 430,
      y: chunkY * CHUNK_SIZE + 100 + (local >>> 9) % 410,
    };
  }).filter(({ x, y }) => Math.hypot(x, y) > 260);
}

export class WorldObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.loadedChunks = new Set();
    this.trees = scene.physics.add.staticGroup({ maxSize: 150 });
    scene.trees = this.trees;
    scene.physics.add.collider(scene.player, this.trees, (_player, tree) => this.touchTree(tree));
    scene.physics.add.overlap(scene.bullets, this.trees, (bullet, tree) => this.hitTree(bullet, tree));
    this.update();
  }

  update() {
    const chunkX = Math.floor(this.scene.player.x / CHUNK_SIZE);
    const chunkY = Math.floor(this.scene.player.y / CHUNK_SIZE);
    for (let y = chunkY - 2; y <= chunkY + 2; y += 1) {
      for (let x = chunkX - 2; x <= chunkX + 2; x += 1) this.loadChunk(x, y);
    }
    this.trees.getChildren().forEach((tree) => {
      if (!tree?.active) return;
      if (Math.abs(tree.chunkX - chunkX) > 3 || Math.abs(tree.chunkY - chunkY) > 3) {
        this.loadedChunks.delete(`${tree.chunkX}:${tree.chunkY}`);
        tree.destroy();
        return;
      }
      const distance = Phaser.Math.Distance.Between(tree.x, tree.y, this.scene.player.x, this.scene.player.y);
      if (tree.hitUntil > this.scene.time.now) tree.setFrame(2);
      else tree.setFrame(distance < 230 ? 1 : 0);
      tree.setDepth(tree.y > this.scene.player.y ? 27 : 17);
      syncGroundShadow(tree);
    });
  }

  loadChunk(chunkX, chunkY) {
    const key = `${chunkX}:${chunkY}`;
    if (this.loadedChunks.has(key) || this.trees.countActive() >= 145) return;
    this.loadedChunks.add(key);
    chunkTreePoints(chunkX, chunkY).forEach(({ x, y }) => this.spawnTree(x, y, chunkX, chunkY));
  }

  spawnTree(x, y, chunkX, chunkY) {
    const tree = this.trees.create(x, y, 'mysterious-tree', 0);
    if (!tree) return;
    tree.setScale(.43).setDepth(17);
    tree.refreshBody();
    tree.body.setSize(128, 72).setOffset(72, 278);
    tree.hp = 45000;
    tree.hitUntil = 0;
    tree.chunkX = chunkX;
    tree.chunkY = chunkY;
    attachGroundShadow(this.scene, tree, {
      width: 92, height: 28, offsetY: 57, depth: 16, alpha: .48,
    });
  }

  touchTree(tree) {
    if (!tree?.active) return;
    if (!this.scene.enemySystem.damagePlayer(TREE_CONTACT_DAMAGE)) return;
    tree.hitUntil = this.scene.time.now + 220;
    const angle = Phaser.Math.Angle.Between(tree.x, tree.y, this.scene.player.x, this.scene.player.y);
    this.scene.physics.velocityFromRotation(angle, 240, this.scene.player.body.velocity);
    this.scene.flashEffect(tree.x, tree.y + 35, 1, .55);
  }

  hitTree(bullet, tree) {
    if (!bullet?.active || !tree?.active) return;
    tree.hp -= bullet.damage || 1;
    tree.hitUntil = this.scene.time.now + 120;
    this.scene.flashEffect(bullet.x, bullet.y, 1, .2);
    bullet.destroy();
    if (tree.hp <= 0) tree.destroy();
  }
}
