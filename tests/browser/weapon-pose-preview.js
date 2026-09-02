import { directionalPose } from '../../src/game/animations.js';
import { syncWeaponSkin } from '../../src/game/SkinPresentation.js';
import { weaponHandPosition } from '../../src/game/WeaponHandAnchors.js';

// Local-only real Phaser render fixture. No production entry imports this file.
export function installWeaponPosePreview({ game, ui, heroes, weapons, skins }) {
  const panel = document.createElement('aside');
  panel.id = 'weapon-pose-preview';
  panel.style.cssText = 'position:fixed;z-index:99999;left:2px;top:2px;background:#111d;color:white;font:11px sans-serif;padding:4px;max-width:96vw';
  const select = (name, entries) => {
    const element = document.createElement('select');
    element.setAttribute('aria-label', name);
    for (const [value, label] of entries) element.add(new Option(label, value));
    panel.append(element);
    return element;
  };
  const hero = select('QA hero', Object.keys(heroes).map((id) => [id, id]));
  const weapon = select('QA weapon', Object.keys(weapons).map((id) => [id, id]));
  const skin = select('QA skin', [['', 'Original'], ...Object.keys(skins).map((id) => [id, id])]);
  skin.selectedIndex = 1;
  const pose = select('QA direction', ['N','NE','E','SE','S','SW','W','NW'].map((id, index) => [String(index), id]));
  pose.value = '2';
  const frame = select('QA frame', Array.from({ length: 6 }, (_, index) => [String(index), `Frame ${index}`]));
  const status = document.createElement('div');
  const start = document.createElement('button');
  start.textContent = 'Show held weapon';
  start.style.cssText = 'font:11px sans-serif;padding:3px;min-height:24px';
  panel.append(start, status);
  const fire = document.createElement('button');
  fire.textContent = 'Fire one shot';
  fire.style.cssText = start.style.cssText;
  panel.append(fire);
  document.body.append(panel);
  const zoom = document.createElement('canvas');
  zoom.width = 288;
  zoom.height = 240;
  zoom.setAttribute('aria-label', 'Magnified actual game framebuffer');
  zoom.style.cssText = 'position:fixed;z-index:99998;right:4px;bottom:4px;width:216px;height:180px;border:1px solid #667;background:#15141d';
  document.body.append(zoom);
  const context = zoom.getContext('2d');
  game.events.on('postrender', () => {
    const source = game.canvas;
    const ratio = source.width / game.scale.width;
    const width = 144 * ratio, height = 120 * ratio;
    context.clearRect(0, 0, zoom.width, zoom.height);
    context.drawImage(source, (source.width - width) / 2, (source.height - height) / 2,
      width, height, 0, 0, zoom.width, zoom.height);
  });
  const showPose = () => {
    const scene = game.scene.getScene('game');
    if (!scene.player?.active) return;
    const angle = -Math.PI / 2 + Number(pose.value) * Math.PI / 4;
    const facing = { x: Math.cos(angle), y: Math.sin(angle) };
    const row = directionalPose(facing.x, facing.y, true);
    scene.facing = facing;
    scene.player.stop().setFrame(row.frameRow * 6 + Number(frame.value)).setFlipX(row.flipX).setRotation(0);
    syncWeaponSkin(scene.weaponSkin, scene.player);
    const hand = weaponHandPosition(scene.state.hero.id, scene.player);
    status.textContent = `${scene.player.texture.key} | ${pose.selectedOptions[0].text} f${frame.value} | hand(${hand.x.toFixed(1)},${hand.y.toFixed(1)}) | guns ${scene.weaponSkin ? 1 : 'baked 1'}`;
  };
  pose.onchange = frame.onchange = showPose;
  fire.onclick = async () => {
    const scene = game.scene.getScene('game');
    if (!scene.player?.active) return;
    fire.disabled = true;
    const angle = -Math.PI / 2 + Number(pose.value) * Math.PI / 4;
    scene.inputController.snapshot = () => ({ moveX: 0, moveY: 0, aimX: Math.cos(angle), aimY: Math.sin(angle), firing: false });
    scene.combat.fire(Math.cos(angle), Math.sin(angle), { free: true });
    scene.scene.resume();
    await new Promise((resolve) => setTimeout(resolve, 50));
    scene.scene.pause();
    fire.disabled = false;
  };
  start.onclick = async () => {
    start.disabled = true;
    try {
      const previous = game.scene.getScene('game').player;
      await ui.onStart({ heroId: hero.value, weaponId: weapon.value, skinId: skin.value || null });
      const scene = game.scene.getScene('game');
      const deadline = performance.now() + 15000;
      while ((!scene.player?.active || scene.player === previous) && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      if (!scene.player?.active || scene.player === previous) throw new Error('Pose fixture failed to start');
      await new Promise((resolve) => setTimeout(resolve, 150));
      scene.scene.pause();
      showPose();
    } catch (error) { status.textContent = error.stack; }
    finally { start.disabled = false; }
  };
}
