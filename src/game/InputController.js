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
    this.pointerDown = false;
    this.onPointerDown = (pointer) => {
      if (pointer.event?.target?.tagName === 'CANVAS') this.pointerDown = true;
    };
    this.onPointerUp = () => { this.pointerDown = false; };
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointerup', this.onPointerUp);
  }

  bindStick(id, target, isAim) {
    const element = document.getElementById(id);
    const knob = element.querySelector('i');
    let pointerId = null;
    const reset = () => {
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
    if (!this.touchAimActive && this.scene.input.activePointer) {
      const pointer = this.scene.input.activePointer;
      aimX = pointer.worldX - player.x;
      aimY = pointer.worldY - player.y;
      const length = Math.hypot(aimX, aimY) || 1;
      aimX /= length;
      aimY /= length;
    }
    return {
      moveX, moveY, aimX, aimY,
      firing: this.touchAimActive || this.pointerDown,
      reload: Boolean(keys?.R && Phaser.Input.Keyboard.JustDown(keys.R)),
    };
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
