export function aimFromClientPoint(point, surface, camera, player, fallback = { x: 1, y: 0 }) {
  if (!point || !surface || !camera || !player) return { ...fallback };
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return { ...fallback };
  const screenX = (point.clientX - rect.left) * (surface.width / rect.width);
  const screenY = (point.clientY - rect.top) * (surface.height / rect.height);
  const world = camera.getWorldPoint(screenX, screenY);
  const x = world.x - player.x;
  const y = world.y - player.y;
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length < .001) return { ...fallback };
  return { x: x / length, y: y / length };
}

export class PointerFireLatch {
  constructor() {
    this.down = false;
    this.queued = false;
    this.pointerId = null;
  }

  press(pointerId = 0) {
    if (this.pointerId !== null && this.pointerId !== pointerId) return false;
    this.pointerId = pointerId;
    this.down = true;
    this.queued = true;
    return true;
  }

  owns(pointerId) { return this.pointerId === pointerId; }

  release(pointerId = this.pointerId) {
    if (!this.owns(pointerId)) return false;
    this.down = false;
    this.pointerId = null;
    return true;
  }

  consume() {
    const firing = this.down || this.queued;
    this.queued = false;
    return firing;
  }
}

export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.move = { x: 0, y: 0 };
    this.aim = { x: 1, y: 0 };
    this.touchAimActive = false;
    this.keys = scene.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,R');
    this.cleanups = [];
    this.bindStick('move-stick', this.move, false);
    this.bindStick('aim-stick', this.aim, true);
    this.pointerFire = new PointerFireLatch();
    this.pointerPoint = null;
    this.canvas = scene.game.canvas;
    this.onPointerDown = (event) => {
      if (!this.pointerFire.press(event.pointerId)) return;
      this.pointerPoint = { clientX: event.clientX, clientY: event.clientY };
      try { this.canvas.setPointerCapture?.(event.pointerId); } catch { /* Window fallback handles release. */ }
      event.preventDefault();
    };
    this.onPointerMove = (event) => {
      if (event.pointerType !== 'mouse' && !this.pointerFire.owns(event.pointerId)) return;
      this.pointerPoint = { clientX: event.clientX, clientY: event.clientY };
    };
    this.onPointerUp = (event) => {
      if (!this.pointerFire.owns(event.pointerId)) return;
      this.pointerPoint = { clientX: event.clientX, clientY: event.clientY };
      this.pointerFire.release(event.pointerId);
      try {
        if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
      } catch { /* The pointer may already be released by the WebView. */ }
      event.preventDefault();
    };
    this.onPointerCancel = (event) => this.pointerFire.release(event.pointerId);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp, true);
    window.addEventListener('pointercancel', this.onPointerCancel, true);
    this.canvas.addEventListener('lostpointercapture', this.onPointerCancel);
  }

  bindStick(id, target, isAim) {
    const element = document.getElementById(id);
    const knob = element.querySelector('i');
    let pointerId = null;
    const reset = (event) => {
      if (event && pointerId !== event.pointerId) return;
      pointerId = null;
      target.x = 0;
      target.y = 0;
      if (isAim) this.touchAimActive = false;
      knob.style.transform = '';
    };
    const update = (event) => {
      if (pointerId !== event.pointerId) return;
      const rect = element.getBoundingClientRect();
      let x = (event.clientX - (rect.left + rect.width / 2)) / (rect.width * .34);
      let y = (event.clientY - (rect.top + rect.height / 2)) / (rect.height * .34);
      const length = Math.hypot(x, y) || 1;
      if (length > 1) { x /= length; y /= length; }
      target.x = x;
      target.y = y;
      if (isAim) this.touchAimActive = true;
      knob.style.transform = `translate(${x * 27}px, ${y * 27}px)`;
    };
    const down = (event) => {
      pointerId = event.pointerId;
      element.setPointerCapture(pointerId);
      update(event);
      event.stopPropagation();
      event.preventDefault();
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', update);
    element.addEventListener('pointerup', reset);
    element.addEventListener('pointercancel', reset);
    this.cleanups.push(() => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', update);
      element.removeEventListener('pointerup', reset);
      element.removeEventListener('pointercancel', reset);
    });
  }

  snapshot(player) {
    const keys = this.keys;
    const keyboardMove = {
      x: Number(keys?.D?.isDown || keys?.RIGHT?.isDown) - Number(keys?.A?.isDown || keys?.LEFT?.isDown),
      y: Number(keys?.S?.isDown || keys?.DOWN?.isDown) - Number(keys?.W?.isDown || keys?.UP?.isDown),
    };
    let moveX = keyboardMove.x || this.move.x;
    let moveY = keyboardMove.y || this.move.y;
    const moveLength = Math.hypot(moveX, moveY) || 1;
    if (moveLength > 1) { moveX /= moveLength; moveY /= moveLength; }

    let aimX = this.aim.x;
    let aimY = this.aim.y;
    if (!this.touchAimActive && this.pointerPoint) {
      const aim = aimFromClientPoint(
        this.pointerPoint,
        this.canvas,
        this.scene.cameras.main,
        player,
        this.aim,
      );
      aimX = aim.x;
      aimY = aim.y;
    }
    return {
      moveX, moveY, aimX, aimY,
      firing: this.touchAimActive || this.pointerFire.consume(),
      reload: Boolean(keys?.R && Phaser.Input.Keyboard.JustDown(keys.R)),
    };
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp, true);
    window.removeEventListener('pointercancel', this.onPointerCancel, true);
    this.canvas.removeEventListener('lostpointercapture', this.onPointerCancel);
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
