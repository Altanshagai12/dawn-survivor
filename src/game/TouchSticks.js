import { anchoredStickVector, isRotatedMobileFallback, surfacePointFromClient } from './inputMath.js?build=20261001a';

const isTouch = (event) => event.pointerType === 'touch' || event.pointerType === 'pen';

export class TouchSticks {
  constructor(controller) {
    this.controller = controller;
    this.canvas = controller.canvas;
    this.layer = document.getElementById('touch-controls');
    this.sticks = ['move', 'aim'].map((role) => {
      const element = document.getElementById(`${role}-stick`);
      return { role, element, knob: element.querySelector('i'), pointerId: null, origin: null };
    });
    this.onDown = (event) => this.press(event);
    this.onMove = (event) => this.update(event);
    this.onEnd = (event) => this.release(event);
    this.canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove, true);
    window.addEventListener('pointerup', this.onEnd, true);
    window.addEventListener('pointercancel', this.onEnd, true);
    this.canvas.addEventListener('lostpointercapture', this.onEnd);
  }

  press(event) {
    if (!isTouch(event)) return;
    const { scene } = this.controller;
    if (scene.ended || scene.choiceOpen || !scene.sys.isActive()) return;
    const rotated = isRotatedMobileFallback();
    const point = surfacePointFromClient(event, this.canvas, rotated);
    if (!point) return;
    event.preventDefault();
    const stick = this.sticks[point.x < this.canvas.width / 2 ? 0 : 1];
    if (stick.pointerId !== null || this.sticks.some((item) => item.pointerId === event.pointerId)) return;
    // Touch-capable laptops may report a fine primary pointer; show controls on actual touch too.
    this.layer.classList.remove('hidden');
    const position = surfacePointFromClient(event, {
      width: this.layer.clientWidth,
      height: this.layer.clientHeight,
      getBoundingClientRect: () => this.layer.getBoundingClientRect(),
    }, rotated);
    if (!position) return;
    stick.pointerId = event.pointerId;
    stick.origin = { clientX: event.clientX, clientY: event.clientY };
    stick.element.style.left = `${position.x}px`;
    stick.element.style.top = `${position.y}px`;
    stick.element.classList.add('active');
    this.controller.pointerPoint = null;
    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* Window events provide a fallback. */ }
    this.update(event);
  }

  update(event) {
    const stick = this.sticks.find((item) => item.pointerId === event.pointerId);
    if (!stick) return;
    const rect = stick.element.getBoundingClientRect();
    const isAim = stick.role === 'aim';
    const { raw, adjusted } = anchoredStickVector(
      event, stick.origin, Math.min(rect.width, rect.height) * .34,
      isRotatedMobileFallback(), isAim ? .16 : .08,
    );
    const target = isAim ? this.controller.aimRaw : this.controller.moveRaw;
    Object.assign(target, adjusted);
    if (isAim) {
      this.controller.touchAimActive = true;
      if (Math.hypot(adjusted.x, adjusted.y) > .06) this.controller.touchAimFiring = true;
    }
    stick.knob.style.transform = `translate(${raw.x * 30}px, ${raw.y * 30}px)`;
    event.preventDefault();
  }

  release(event) {
    const stick = this.sticks.find((item) => item.pointerId === event.pointerId);
    if (!stick) return;
    this.resetStick(stick);
    event.preventDefault();
  }

  resetStick(stick) {
    const pointerId = stick.pointerId;
    stick.pointerId = null;
    stick.origin = null;
    const target = stick.role === 'aim' ? this.controller.aimRaw : this.controller.moveRaw;
    Object.assign(target, { x: 0, y: 0 });
    if (stick.role === 'aim') {
      this.controller.touchAimActive = false;
      this.controller.touchAimFiring = false;
    } else {
      this.controller.move = { x: 0, y: 0 };
    }
    stick.element.classList.remove('active');
    stick.knob.style.transform = '';
    try {
      if (pointerId !== null && this.canvas.hasPointerCapture(pointerId)) this.canvas.releasePointerCapture(pointerId);
    } catch { /* The browser may have already cancelled capture. */ }
  }

  reset() { this.sticks.forEach((stick) => this.resetStick(stick)); }

  destroy() {
    this.reset();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove, true);
    window.removeEventListener('pointerup', this.onEnd, true);
    window.removeEventListener('pointercancel', this.onEnd, true);
    this.canvas.removeEventListener('lostpointercapture', this.onEnd);
  }
}
