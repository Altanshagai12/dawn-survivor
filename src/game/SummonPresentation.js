function transient(scene, object, tween) {
  const cap = scene.performance?.vfxCap || 72;
  if ((scene.activeVfx || 0) >= cap) { object.destroy(); return; }
  scene.activeVfx = (scene.activeVfx || 0) + 1;
  object.once('destroy', () => { scene.activeVfx = Math.max(0, scene.activeVfx - 1); });
  scene.tweens.add({ targets: object, ...tween, onComplete: () => object.destroy() });
}

function mote(scene, x, y, angle, length, color, duration = 150) {
  const spark = scene.add.ellipse(x, y, length, 2, color, .8)
    .setDepth(31).setRotation(angle).setBlendMode(Phaser.BlendModes.ADD);
  transient(scene, spark, {
    x: x + Math.cos(angle) * 15, y: y + Math.sin(angle) * 15,
    alpha: 0, scaleX: .35, duration,
  });
}

export function presentSummonCast(scene, source, kind, angle) {
  if (kind === 'ghost') {
    const ring = scene.add.circle(source.x, source.y, 8, 0x8cffe4, .12)
      .setStrokeStyle(1.5, 0xafffed, .85).setDepth(30);
    transient(scene, ring, { alpha: 0, scale: 2.1, duration: 240 });
  } else {
    mote(scene, source.x, source.y, angle, 22, 0xf2e3bb, 110);
  }
}

export function presentSummonImpact(scene, bullet, x, y) {
  const angle = bullet.trajectoryAngle ?? bullet.rotation ?? 0;
  if (bullet.summonKind === 'ghost') {
    const ring = scene.add.circle(x, y, 5, 0xa8f5e6, .2)
      .setStrokeStyle(1.5, 0xa8f5e6, .8).setDepth(33);
    transient(scene, ring, { alpha: 0, scale: 2.8, duration: 260 });
    for (let i = 0; i < 3; i++) mote(scene, x, y, angle + i * 2.1, 6, 0x85dbe7, 220);
  } else {
    for (let i = 0; i < 3; i++) mote(scene, x, y, angle + Math.PI + (i-1)*.7, 16-i*3, 0xffedc4, 105);
  }
}

export function updateSummonTrail(scene, bullet) {
  if (scene.time.now < (bullet.nextSummonTrailAt || 0)) return;
  bullet.nextSummonTrailAt = scene.time.now + (scene.performance?.mobile ? 75 : 50);
  const angle = bullet.trajectoryAngle ?? bullet.rotation ?? 0;
  const ghost = bullet.summonKind === 'ghost';
  if (ghost) {
    const wisp = scene.add.ellipse(bullet.x, bullet.y, 9, 5, 0x76d6e7, .32)
      .setDepth(29).setRotation(angle).setBlendMode(Phaser.BlendModes.ADD);
    transient(scene, wisp, { alpha: 0, scale: .2, y: bullet.y - 5, duration: 230 });
  } else {
    const streak = scene.add.rectangle(bullet.x, bullet.y, 13, 1, 0xc9e3f5, .42)
      .setDepth(29).setRotation(angle);
    transient(scene, streak, { alpha: 0, scaleX: .3, duration: 100 });
  }
}
