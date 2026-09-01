export const PLAYER_OUTER_LIGHT_DIAMETER = 720;
export const PLAYER_INNER_LIGHT_DIAMETER = 280;

export function playerOuterLightRadius(scale = 1) {
  return PLAYER_OUTER_LIGHT_DIAMETER * .5 * scale;
}

export function playerInnerLightScale(scale = 1) {
  return Math.min(1, scale + .08);
}

export function playerBrightLightRadius(scale = 1) {
  return PLAYER_INNER_LIGHT_DIAMETER * .5 * playerInnerLightScale(scale);
}

function circleTexture(scene, key, color, radius) {
  if (scene.textures.exists(key)) return;
  const graphics = scene.make.graphics({ add: false });
  graphics.fillStyle(color, 1).fillCircle(radius, radius, radius);
  graphics.generateTexture(key, radius * 2, radius * 2).destroy();
}

function canvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  draw(texture.getContext(), width, height);
  texture.refresh();
}

function radialTexture(scene, key, size, stops) {
  canvasTexture(scene, key, size, size, (context) => {
    const center = size / 2;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    stops.forEach(([position, color]) => gradient.addColorStop(position, color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

export function createGameTextures(scene) {
  circleTexture(scene, 'bullet', 0x9cf4ff, 4);
  canvasTexture(scene, 'bullet-revolver', 36, 14, (context) => {
    const trail = context.createLinearGradient(0, 0, 36, 0);
    trail.addColorStop(0, 'rgba(255,226,202,0)');
    trail.addColorStop(.58, 'rgba(255,226,202,.34)');
    trail.addColorStop(1, 'rgba(255,250,235,1)');
    context.fillStyle = trail;
    context.beginPath();
    context.moveTo(0, 7); context.lineTo(28, 4); context.lineTo(36, 7); context.lineTo(28, 10);
    context.closePath(); context.fill();
    context.strokeStyle = 'rgba(255,238,220,.68)'; context.lineWidth = 1;
    context.beginPath(); context.moveTo(6, 3); context.lineTo(13, 6); context.moveTo(10, 11); context.lineTo(17, 8); context.stroke();
  });
  canvasTexture(scene, 'bullet-pellet', 20, 10, (context) => {
    const trail = context.createLinearGradient(0, 0, 20, 0);
    trail.addColorStop(0, 'rgba(255,222,195,0)'); trail.addColorStop(.55, 'rgba(255,226,204,.45)'); trail.addColorStop(1, '#fff8e7');
    context.fillStyle = trail;
    context.beginPath(); context.moveTo(1, 5); context.lineTo(15, 2); context.lineTo(20, 5); context.lineTo(15, 8); context.closePath(); context.fill();
  });
  canvasTexture(scene, 'bullet-bolt', 64, 10, (context) => {
    const streak = context.createLinearGradient(0, 0, 64, 0);
    streak.addColorStop(0, 'rgba(255,238,218,0)'); streak.addColorStop(.18, 'rgba(255,238,218,.25)'); streak.addColorStop(1, '#fff9ec');
    context.fillStyle = streak; context.fillRect(2, 4, 55, 2);
    context.fillStyle = '#fffdf3';
    context.beginPath(); context.moveTo(64, 5); context.lineTo(54, 1); context.lineTo(56, 5); context.lineTo(54, 9); context.closePath(); context.fill();
  });
  canvasTexture(scene, 'bullet-flame', 44, 22, (context) => {
    [[18, 11, 10], [28, 8, 8], [36, 12, 7]].forEach(([x, y, radius], index) => {
      const glow = context.createRadialGradient(x + 2, y, 1, x, y, radius);
      glow.addColorStop(0, index === 2 ? '#fff4c9' : '#ffd970');
      glow.addColorStop(.42, index === 0 ? 'rgba(255,85,26,.88)' : 'rgba(255,151,35,.92)');
      glow.addColorStop(1, 'rgba(255,62,18,0)');
      context.fillStyle = glow; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill();
    });
    context.fillStyle = 'rgba(166,142,126,.4)';
    context.fillRect(3, 9, 4, 3); context.fillRect(9, 5, 3, 2); context.fillRect(11, 15, 3, 2);
  });
  canvasTexture(scene, 'bullet-spirit', 28, 14, (context) => {
    const glow = context.createRadialGradient(20, 7, 1, 20, 7, 9);
    glow.addColorStop(0, '#ecffff'); glow.addColorStop(.3, '#68eaff');
    glow.addColorStop(.7, 'rgba(115,83,255,.55)'); glow.addColorStop(1, 'rgba(80,45,180,0)');
    context.fillStyle = glow; context.fillRect(7, 0, 21, 14);
    context.strokeStyle = 'rgba(120,105,255,.7)'; context.lineWidth = 2;
    context.beginPath(); context.moveTo(0, 10); context.quadraticCurveTo(10, 0, 22, 7); context.stroke();
  });

  canvasTexture(scene, 'enemy-bullet', 32, 20, (context) => {
    const glow = context.createRadialGradient(22, 10, 1, 22, 10, 10);
    glow.addColorStop(0, 'rgba(232,255,205,1)');
    glow.addColorStop(.28, 'rgba(112,255,177,.95)');
    glow.addColorStop(.65, 'rgba(35,190,130,.36)');
    glow.addColorStop(1, 'rgba(20,120,85,0)');
    context.fillStyle = glow;
    context.fillRect(10, 0, 22, 20);
    const trail = context.createLinearGradient(1, 0, 25, 0);
    trail.addColorStop(0, 'rgba(24,110,84,0)');
    trail.addColorStop(.52, 'rgba(58,225,155,.42)');
    trail.addColorStop(1, 'rgba(205,255,190,.95)');
    context.fillStyle = trail;
    context.beginPath();
    context.moveTo(1, 10);
    context.quadraticCurveTo(15, 4, 27, 10);
    context.quadraticCurveTo(15, 16, 1, 10);
    context.fill();
    context.fillStyle = '#efffcf';
    context.beginPath();
    context.ellipse(23, 10, 4.5, 2.6, 0, 0, Math.PI * 2);
    context.fill();
  });

  radialTexture(scene, 'player-light-outer', PLAYER_OUTER_LIGHT_DIAMETER, [
    [0, 'rgba(95,195,225,.14)'],
    [.42, 'rgba(70,145,190,.08)'],
    [1, 'rgba(35,80,125,0)'],
  ]);
  radialTexture(scene, 'player-light-inner', PLAYER_INNER_LIGHT_DIAMETER, [
    [0, 'rgba(255,233,185,.32)'],
    [.34, 'rgba(255,211,145,.20)'],
    [1, 'rgba(235,170,95,0)'],
  ]);
  canvasTexture(scene, 'ground-shadow', 80, 36, (context) => {
    context.translate(40, 18);
    context.scale(1, .42);
    const gradient = context.createRadialGradient(0, 0, 2, 0, 0, 34);
    gradient.addColorStop(0, 'rgba(0,0,0,.72)');
    gradient.addColorStop(.48, 'rgba(0,0,0,.38)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(-40, -44, 80, 88);
  });
  canvasTexture(scene, 'dust-puff', 48, 28, (context) => {
    const gradient = context.createRadialGradient(24, 15, 1, 24, 15, 23);
    gradient.addColorStop(0, 'rgba(177,155,126,.76)');
    gradient.addColorStop(.4, 'rgba(126,109,91,.44)');
    gradient.addColorStop(.76, 'rgba(85,76,70,.2)');
    gradient.addColorStop(1, 'rgba(64,58,56,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 48, 28);
    context.fillStyle = 'rgba(207,184,145,.54)';
    context.fillRect(16, 17, 3, 2);
    context.fillRect(30, 11, 2, 2);
    context.fillRect(35, 18, 2, 1);
  });
  canvasTexture(scene, 'warning-ring', 80, 80, (context) => {
    context.strokeStyle = 'rgba(191,113,255,.9)'; context.lineWidth = 3;
    context.setLineDash([7, 6]); context.beginPath(); context.arc(40, 40, 31, 0, Math.PI * 2); context.stroke();
    context.strokeStyle = 'rgba(101,230,255,.5)'; context.lineWidth = 1;
    context.beginPath(); context.arc(40, 40, 23, 0, Math.PI * 2); context.stroke();
  });
  radialTexture(scene, 'wingling-glow', 96, [
    [0, 'rgba(65,238,255,.62)'],
    [.3, 'rgba(51,170,255,.32)'],
    [.62, 'rgba(135,74,255,.18)'],
    [1, 'rgba(70,32,150,0)'],
  ]);
  canvasTexture(scene, 'wingling-trail', 80, 28, (context) => {
    const gradient = context.createLinearGradient(0, 0, 80, 0);
    gradient.addColorStop(0, 'rgba(111,65,238,0)');
    gradient.addColorStop(.36, 'rgba(111,65,238,.15)');
    gradient.addColorStop(.78, 'rgba(69,211,255,.42)');
    gradient.addColorStop(1, 'rgba(69,236,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(40, 14, 39, 9, 0, 0, Math.PI * 2);
    context.fill();
  });
  if (!scene.textures.exists('ember')) {
    const graphics = scene.make.graphics({ add: false });
    graphics.fillStyle(0x71efff).fillTriangle(6, 0, 12, 6, 6, 13).fillTriangle(6, 0, 0, 6, 6, 13);
    graphics.generateTexture('ember', 12, 13).destroy();
  }
  if (!scene.textures.exists('chest')) {
    const graphics = scene.make.graphics({ add: false });
    graphics.fillStyle(0x17121f).fillRoundedRect(0, 7, 38, 28, 5);
    graphics.lineStyle(3, 0xb89053).strokeRoundedRect(1, 8, 36, 26, 5);
    graphics.fillStyle(0x65e6ff).fillRect(16, 17, 6, 8);
    graphics.generateTexture('chest', 38, 38).destroy();
  }
}

export function createPlayerLights(scene, player, scale = 1) {
  const lights = [
    scene.add.image(player.x, player.y, 'player-light-outer')
      .setDepth(1).setBlendMode(Phaser.BlendModes.ADD),
    scene.add.image(player.x, player.y, 'player-light-inner')
      .setDepth(2).setBlendMode(Phaser.BlendModes.ADD),
  ];
  lights[0].setScale(scale);
  lights[1].setScale(playerInnerLightScale(scale));
  return lights;
}

export function syncPlayerLights(lights, player) {
  lights?.forEach((light) => light.setPosition(player.x, player.y));
}

export function createReloadIndicator(scene, player) {
  const track = scene.add.rectangle(0, 0, 48, 7, 0x08090e, .84)
    .setOrigin(.5).setStrokeStyle(1, 0x82979b, .72);
  const fill = scene.add.rectangle(-22, 0, 44, 3, 0x65e6ff, 1).setOrigin(0, .5);
  const container = scene.add.container(player.x, player.y, [track, fill])
    .setDepth(38).setVisible(false);
  return { container, fill };
}

export function reloadIndicatorState(player, state) {
  const reloading = Boolean(state.reloading);
  const charge = Math.min(1, state.weaponCharge || 0);
  const charging = !reloading && Boolean(state.weapon?.chargeSeconds) && charge > .01 && charge < .995;
  const progress = reloading
    ? Math.min(1, state.reloadProgress / Math.max(1, state.reloadMs))
    : charge;
  return {
    visible: reloading || charging,
    progress,
    x: player.x,
    y: player.y - player.displayHeight * .5 - 12,
    color: reloading ? 0x65e6ff : 0xffd36c,
  };
}

export function syncReloadIndicator(indicator, player, state) {
  if (!indicator?.container?.active) return;
  const visual = reloadIndicatorState(player, state);
  indicator.container.setPosition(visual.x, visual.y).setVisible(visual.visible);
  indicator.fill.setScale(visual.progress, 1).setFillStyle(visual.color, 1);
}

export function runDustOrigin(player, moveX, moveY) {
  const length = Math.hypot(moveX, moveY) || 1;
  const directionX = moveX / length;
  const directionY = moveY / length;
  return {
    x: player.x - directionX * 14,
    y: player.y + player.displayHeight * .36 - directionY * 8,
    directionX,
    directionY,
  };
}

export function spawnRunDust(scene, player, moveX, moveY) {
  const origin = runDustOrigin(player, moveX, moveY);
  const sideX = -origin.directionY;
  const sideY = origin.directionX;
  const side = Phaser.Math.Between(-5, 5);
  const depth = player.depth - .5;
  const dust = scene.add.image(
    origin.x + sideX * side,
    origin.y + sideY * side,
    'dust-puff',
  ).setDepth(depth).setAlpha(.72).setScale(.58, .36);
  scene.tweens.add({
    targets: dust, alpha: 0, scaleX: 1.08, scaleY: .66,
    x: dust.x - origin.directionX * 18, y: dust.y - origin.directionY * 8 - 4,
    duration: 430, ease: 'Quad.easeOut', onComplete: () => dust.destroy(),
  });
  const wisp = scene.add.image(
    origin.x - origin.directionX * 7 - sideX * side,
    origin.y - origin.directionY * 4 - sideY * side,
    'dust-puff',
  ).setDepth(depth).setAlpha(.5).setScale(.32, .2);
  scene.tweens.add({
    targets: wisp, alpha: 0, scaleX: .7, scaleY: .42,
    x: wisp.x - origin.directionX * 23, y: wisp.y - origin.directionY * 10 - 6,
    duration: 360, ease: 'Quad.easeOut', onComplete: () => wisp.destroy(),
  });
}

export function showSpawnWarning(scene, x, y, duration = 650) {
  const warning = scene.add.image(x, y, 'warning-ring')
    .setDepth(18).setScale(.55).setAlpha(.35).setBlendMode(Phaser.BlendModes.ADD);
  warning.pulseTween = scene.tweens.add({
    targets: warning, alpha: .95, scale: 1.05, angle: 55,
    duration: Math.max(180, duration * .42), yoyo: true, repeat: -1,
  });
  warning.once('destroy', () => warning.pulseTween?.stop());
  return warning;
}

export function attachGroundShadow(scene, entity, options = {}) {
  const width = options.width || Math.max(24, entity.displayWidth * .62);
  const height = options.height || Math.max(8, width * .28);
  const shadow = scene.add.image(entity.x, entity.y, 'ground-shadow')
    .setDepth(options.depth ?? entity.depth - 1)
    .setDisplaySize(width, height)
    .setAlpha(options.alpha ?? .36);
  entity.groundShadow = shadow;
  entity.groundShadowOffsetY = options.offsetY ?? entity.displayHeight * .3;
  entity.groundShadowAlpha = shadow.alpha;
  entity.once('destroy', () => shadow.destroy());
  syncGroundShadow(entity);
  return shadow;
}

export function syncGroundShadow(entity) {
  if (!entity?.groundShadow?.active) return;
  entity.groundShadow
    .setPosition(entity.x, entity.y + entity.groundShadowOffsetY)
    .setAlpha(entity.groundShadowAlpha * entity.alpha);
}
