// Dedicated world sprites. Upgrade-card artwork has borders and unrelated glyphs.
export const SUMMON_TEXTURES = Object.freeze({
  ghost: 'summon-ghost', dagger: 'summon-dagger', scythe: 'summon-scythe', bug: 'summon-bug',
});

function paint(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  draw(texture.getContext());
  texture.refresh();
}

function path(c, points, fill, stroke = null, width = 2) {
  c.beginPath();
  points.forEach(([x, y], index) => index ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

function glow(c, x, y, radius, color) {
  const gradient = c.createRadialGradient(x, y, 1, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, 'rgba(76,209,255,0)');
  c.fillStyle = gradient; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function dagger(c) {
  path(c, [[19,79],[29,74],[39,78],[118,72],[151,80],[119,88],[39,83],[29,88]], '#293b56', '#a4bed0');
  path(c, [[47,76],[117,74],[147,80],[56,80]], '#eef8ff');
  path(c, [[56,80],[147,80],[116,86],[47,84]], '#759cae');
  path(c, [[42,66],[49,67],[53,80],[48,94],[41,94],[45,80]], '#b9e5e8', '#36516a');
  c.fillStyle = '#8fa5b2'; c.fillRect(26,77,17,6);
  c.fillStyle = '#fff7bf'; c.fillRect(45,77,5,6);
}

export function createSummonTextures(scene) {
  paint(scene, SUMMON_TEXTURES.ghost, 160, 176, (c) => {
    glow(c, 80, 79, 70, 'rgba(85,223,255,.26)');
    const body = c.createLinearGradient(0, 35, 0, 156);
    body.addColorStop(0, '#edffff'); body.addColorStop(.5, '#9bdedc'); body.addColorStop(1, '#426b9c');
    c.beginPath(); c.moveTo(42,104); c.bezierCurveTo(34,21,119,18,120,83);
    c.bezierCurveTo(123,116,97,132,120,149); c.bezierCurveTo(93,153,94,136,80,134);
    c.bezierCurveTo(67,133,56,161,42,151); c.bezierCurveTo(59,129,31,129,42,104);
    c.fillStyle = body; c.fill(); c.strokeStyle = '#a5f7ec'; c.lineWidth = 3; c.stroke();
    path(c, [[48,83],[55,89],[62,108],[35,117],[25,113]], '#84c9d3');
    path(c, [[114,81],[122,93],[135,104],[126,112],[111,104]], '#a7e7df');
    c.fillStyle = '#182c47';
    c.beginPath(); c.ellipse(64,77,8,12,-.18,0,Math.PI*2); c.ellipse(93,77,8,12,.18,0,Math.PI*2); c.fill();
    c.fillStyle = '#eeffff'; c.fillRect(63,72,4,7); c.fillRect(90,72,4,7);
    c.strokeStyle = '#45717f'; c.lineWidth = 3; c.beginPath(); c.arc(80,95,7,.2,2.9); c.stroke();
  });
  paint(scene, SUMMON_TEXTURES.dagger, 160, 160, dagger);
  paint(scene, SUMMON_TEXTURES.scythe, 192, 192, (c) => {
    c.lineCap = 'round'; c.strokeStyle = '#132333'; c.lineWidth = 13;
    c.beginPath(); c.moveTo(58,166); c.lineTo(102,39); c.stroke();
    c.strokeStyle = '#8b7392'; c.lineWidth = 6; c.stroke();
    path(c, [[98,37],[119,23],[150,27],[175,50],[179,81],[168,106],[166,66],[145,50],[119,50],[110,64]], '#d7e2e9', '#344354', 3);
    path(c, [[111,39],[137,32],[164,51],[175,80],[163,60],[137,45]], '#fcffff');
    path(c, [[102,44],[111,50],[108,63],[99,67],[94,56]], '#a26ef3', '#e7c6ff');
    c.strokeStyle = '#d4c197'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(61+i*3,145-i*9); c.lineTo(72+i*3,149-i*9); c.stroke(); }
  });
  paint(scene, SUMMON_TEXTURES.bug, 128, 128, (c) => {
    glow(c,64,64,55,'rgba(124,247,148,.24)');
    c.fillStyle = 'rgba(197,253,215,.68)'; c.strokeStyle = '#dcfff1'; c.lineWidth = 2;
    for (const side of [-1,1]) {
      c.beginPath(); c.ellipse(64+side*24,56,24,11,side*.6,0,Math.PI*2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(64+side*9,38); c.lineTo(64+side*20,22); c.stroke();
      c.beginPath(); c.moveTo(64+side*9,67); c.lineTo(64+side*21,83); c.stroke();
    }
    c.fillStyle = '#223b36'; c.beginPath(); c.ellipse(64,61,13,27,0,0,Math.PI*2); c.fill();
    c.fillStyle = '#c6ff92'; c.beginPath(); c.ellipse(64,70,9,14,0,0,Math.PI*2); c.fill();
    c.fillStyle = '#fffed0'; c.fillRect(57,37,4,5); c.fillRect(67,37,4,5);
    path(c, [[65,55],[60,66],[66,65],[63,77],[70,63],[65,64]], '#faffdc');
  });
  // Bullet frames retain the original 28 × 14 envelope and gameplay radius.
  paint(scene, 'summon-ghost-shot', 28, 14, (c) => {
    glow(c,14,7,9,'rgba(126,245,226,.65)');
    c.strokeStyle = 'rgba(100,187,233,.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(1,10); c.quadraticCurveTo(6,0,14,7); c.stroke();
    c.fillStyle = '#dbfff0'; c.beginPath(); c.ellipse(14,7,4,3,0,0,Math.PI*2); c.fill();
  });
  paint(scene, 'summon-dagger-shot', 28, 14, (c) => {
    path(c, [[8,5],[16,5],[24,7],[16,9],[8,9]], '#89b4ce');
    path(c, [[8,5],[16,5],[24,7],[8,7]], '#f0fbff');
    c.fillStyle = '#d1aa65'; c.fillRect(7,3,2,8);
    c.fillStyle = '#7893ac'; c.fillRect(2,6,5,2);
  });
}
