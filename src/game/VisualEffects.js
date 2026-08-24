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
  circleTexture(scene, 'wisp', 0x87ecff, 8);

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

  radialTexture(scene, 'player-light-outer', 720, [
    [0, 'rgba(95,195,225,.14)'],
    [.42, 'rgba(70,145,190,.08)'],
    [1, 'rgba(35,80,125,0)'],
  ]);
  radialTexture(scene, 'player-light-inner', 280, [
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

export function createPlayerLights(scene, player) {
  return [
    scene.add.image(player.x, player.y, 'player-light-outer')
      .setDepth(1).setBlendMode(Phaser.BlendModes.ADD),
    scene.add.image(player.x, player.y, 'player-light-inner')
      .setDepth(2).setBlendMode(Phaser.BlendModes.ADD),
  ];
}

export function syncPlayerLights(lights, player) {
  lights?.forEach((light) => light.setPosition(player.x, player.y));
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
