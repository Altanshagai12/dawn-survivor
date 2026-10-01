import { aimFromClientPoint, smoothDirection, smoothStick } from './inputMath.js?build=20261001a';
import { TouchSticks } from './TouchSticks.js?build=20261001a';
export * from './inputMath.js?build=20261001a';

export function usesCanvasFire(pointerType) { return !pointerType || pointerType === 'mouse'; }

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
    this.pointerFire = new PointerFireLatch();
    this.pointerPoint = null;
    this.canvas = scene.game.canvas;
    this.touchSticks = new TouchSticks(this);
    this.onReset = () => this.reset();
    this.onVisibility = () => { if (document.hidden) this.reset(); };
    window.addEventListener('blur', this.onReset);
    window.addEventListener('resize', this.onReset);
    window.addEventListener('orientationchange', this.onReset);
    document.addEventListener('visibilitychange', this.onVisibility);
    scene.events.on('pause', this.onReset);
    this.onPointerDown = (event) => {
      if (scene.ended || scene.choiceOpen || !scene.sys.isActive()) return;
      if (!usesCanvasFire(event.pointerType)) return;
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
      if (!usesCanvasFire(event.pointerType)) return;
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

  reset() {
    this.touchSticks.reset();
    this.move = { x: 0, y: 0 };
    const pointerId = this.pointerFire.pointerId;
    this.pointerFire.release();
    this.pointerFire.queued = false;
    this.pointerPoint = null;
    this.abilityQueued = false;
    try {
      if (this.canvas.hasPointerCapture?.(pointerId)) this.canvas.releasePointerCapture(pointerId);
    } catch { /* The browser may have already cancelled capture. */ }
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
    this.reset();
    this.touchSticks.destroy();
    window.removeEventListener('blur', this.onReset);
    window.removeEventListener('resize', this.onReset);
    window.removeEventListener('orientationchange', this.onReset);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.scene.events.off('pause', this.onReset);
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
