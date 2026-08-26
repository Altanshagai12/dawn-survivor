export function isRotatedMobileFallback() {
  return typeof document !== 'undefined'
    && document.documentElement.classList.contains('mobile-rotated');
}

export function gameVectorFromClient(vector, rotated = false) {
  return rotated ? { x: vector.y, y: -vector.x } : { ...vector };
}

export function surfacePointFromClient(point, surface, rotated = false) {
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  if (rotated) {
    return {
      x: (point.clientY - rect.top) * (surface.width / rect.height),
      y: (rect.right - point.clientX) * (surface.height / rect.width),
    };
  }
  return {
    x: (point.clientX - rect.left) * (surface.width / rect.width),
    y: (point.clientY - rect.top) * (surface.height / rect.height),
  };
}

export function aimFromClientPoint(
  point,
  surface,
  camera,
  player,
  fallback = { x: 1, y: 0 },
  rotated = isRotatedMobileFallback(),
) {
  if (!point || !surface || !camera || !player) return { ...fallback };
  const screen = surfacePointFromClient(point, surface, rotated);
  if (!screen) return { ...fallback };
  const world = camera.getWorldPoint(screen.x, screen.y);
  const x = world.x - player.x;
  const y = world.y - player.y;
  const length = Math.hypot(x, y);
  if (!Number.isFinite(length) || length < .001) return { ...fallback };
  return { x: x / length, y: y / length };
}

export function radialDeadZone(vector, deadZone = .08) {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length <= deadZone) return { x: 0, y: 0 };
  const magnitude = Math.min(1, (length - deadZone) / (1 - deadZone));
  return { x: vector.x / length * magnitude, y: vector.y / length * magnitude };
}

export function smoothStick(current, target, amount = .42) {
  const x = current.x + (target.x - current.x) * amount;
  const y = current.y + (target.y - current.y) * amount;
  if (Math.hypot(target.x, target.y) < .001 && Math.hypot(x, y) < .025) return { x: 0, y: 0 };
  return { x, y };
}

export function smoothDirection(current, target, amount = .5) {
  const targetLength = Math.hypot(target.x, target.y);
  if (targetLength < .001) return { ...current };
  const x = current.x + (target.x / targetLength - current.x) * amount;
  const y = current.y + (target.y / targetLength - current.y) * amount;
  const length = Math.hypot(x, y);
  if (length < .001) return { x: target.x / targetLength, y: target.y / targetLength };
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
    this.moveRaw = { x: 0, y: 0 };
    this.aimRaw = { x: 0, y: 0 };
    this.move = { x: 0, y: 0 };
    this.aim = { x: 1, y: 0 };
    this.touchAimActive = false;
    this.touchAimFiring = false;
    this.keys = scene.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,R,SPACE');
    this.abilityQueued = false;
    this.cleanups = [];
    this.bindStick('move-stick', this.moveRaw, false);
    this.bindStick('aim-stick', this.aimRaw, true);
    this.pointerFire = new PointerFireLatch();
    this.pointerPoint = null;
    this.canvas = scene.game.canvas;
    this.onPointerDown = (event) => {
      if (event.button === 2) {
        this.abilityQueued = true;
        this.pointerPoint = { clientX: event.clientX, clientY: event.clientY };
        event.preventDefault();
        return;
      }
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
    this.onContextMenu = (event) => event.preventDefault();
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.bindAbilityButton();
  }

  bindAbilityButton() {
    const button = document.getElementById('ability-button');
    if (!button) return;
    const trigger = (event) => {
      this.abilityQueued = true;
      event.stopPropagation();
      event.preventDefault();
    };
    button.addEventListener('pointerdown', trigger);
    this.cleanups.push(() => button.removeEventListener('pointerdown', trigger));
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
      if (isAim) {
        this.touchAimActive = false;
        this.touchAimFiring = false;
      }
      knob.style.transform = '';
    };
    const update = (event) => {
      if (pointerId !== event.pointerId) return;
      const rect = element.getBoundingClientRect();
      const clientVector = {
        x: (event.clientX - (rect.left + rect.width / 2)) / (rect.width * .34),
        y: (event.clientY - (rect.top + rect.height / 2)) / (rect.height * .34),
      };
      let { x, y } = gameVectorFromClient(clientVector, isRotatedMobileFallback());
      const length = Math.hypot(x, y) || 1;
      if (length > 1) { x /= length; y /= length; }
      const adjusted = radialDeadZone({ x, y }, isAim ? .045 : .08);
      target.x = adjusted.x;
      target.y = adjusted.y;
      if (isAim) {
        this.touchAimActive = true;
        if (Math.hypot(adjusted.x, adjusted.y) > .035) this.touchAimFiring = true;
      }
      knob.style.transform = `translate(${x * 30}px, ${y * 30}px)`;
    };
    const down = (event) => {
      pointerId = event.pointerId;
      element.setPointerCapture(pointerId);
      if (isAim) this.pointerPoint = null;
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
    const keyboardActive = Math.hypot(keyboardMove.x, keyboardMove.y) > 0;
    const moveTarget = keyboardActive ? keyboardMove : this.moveRaw;
    this.move = smoothStick(this.move, moveTarget, keyboardActive ? 1 : .46);
    let moveX = this.move.x;
    let moveY = this.move.y;
    const moveLength = Math.hypot(moveX, moveY) || 1;
    if (moveLength > 1) { moveX /= moveLength; moveY /= moveLength; }

    let aimX;
    let aimY;
    if (this.touchAimActive) {
      this.aim = smoothDirection(this.aim, this.aimRaw, .58);
      aimX = this.aim.x;
      aimY = this.aim.y;
    } else if (this.pointerPoint) {
      const aim = aimFromClientPoint(
        this.pointerPoint,
        this.canvas,
        this.scene.cameras.main,
        player,
        this.aim,
      );
      aimX = aim.x;
      aimY = aim.y;
      this.aim = aim;
    } else {
      aimX = this.aim.x;
      aimY = this.aim.y;
    }
    const ability = this.abilityQueued || Boolean(keys?.SPACE && Phaser.Input.Keyboard.JustDown(keys.SPACE));
    this.abilityQueued = false;
    return {
      moveX, moveY, aimX, aimY,
      firing: this.touchAimFiring || this.pointerFire.consume(),
      reload: Boolean(keys?.R && Phaser.Input.Keyboard.JustDown(keys.R)),
      ability,
    };
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp, true);
    window.removeEventListener('pointercancel', this.onPointerCancel, true);
    this.canvas.removeEventListener('lostpointercapture', this.onPointerCancel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
