import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { InputController } from '../src/game/InputController.js';

class Surface extends EventTarget {
  constructor(rect = { left: 20, top: 70, right: 864, width: 844, height: 390 }) {
    super();
    this.rect = rect;
    this.style = {};
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
    };
    this.captured = new Set();
    this.width = this.clientWidth = 844;
    this.height = this.clientHeight = 390;
    this.knob = { style: {} };
  }
  querySelector() { return this.knob; }
  getBoundingClientRect() { return this.rect; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
}

function fixture(t, rotated = false) {
  const oldDocument = globalThis.document;
  const oldWindow = globalThis.window;
  const rect = rotated
    ? { left: 20, top: 70, right: 410, width: 390, height: 844 }
    : { left: 20, top: 70, right: 864, width: 844, height: 390 };
  const canvas = new Surface(rect);
  const layer = new Surface(rect);
  const move = new Surface({ width: 96, height: 96 });
  const aim = new Surface({ width: 96, height: 96 });
  const ability = new Surface();
  const elements = { 'touch-controls': layer, 'move-stick': move, 'aim-stick': aim, 'ability-button': ability };
  globalThis.window = new Surface();
  globalThis.document = Object.assign(new Surface(), {
    hidden: false,
    documentElement: { classList: { contains: () => rotated } },
    getElementById: (id) => elements[id],
  });
  const scene = {
    game: { canvas }, input: {}, events: new EventEmitter(),
    sys: { isActive: () => !scene.paused },
    cameras: { main: { getWorldPoint: (x, y) => ({ x, y }) } },
  };
  const input = new InputController(scene);
  t.after(() => { input.destroy(); globalThis.document = oldDocument; globalThis.window = oldWindow; });
  const pointer = (target, type, id, x, y, pointerType = 'touch', button = 0) => {
    const event = new Event(type, { cancelable: true });
    const point = rotated ? { clientX: rect.right - y, clientY: rect.top + x }
      : { clientX: rect.left + x, clientY: rect.top + y };
    Object.assign(event, point, { pointerId: id, pointerType, button });
    target.dispatchEvent(event);
    return event;
  };
  return { canvas, layer, move, aim, ability, input, scene, pointer, win: window, doc: document };
}

for (const rotated of [false, true]) {
  test(`floating sticks start at the touch in an offset ${rotated ? 'rotated' : 'landscape'} frame`, (t) => {
    const { canvas, move, aim, input, pointer, win } = fixture(t, rotated);
    assert.equal(move.classList.contains('active'), false);
    pointer(canvas, 'pointerdown', 1, 300, 160);
    assert.equal(move.style.left, '300px');
    assert.equal(move.style.top, '160px');
    assert.ok(move.classList.contains('active'));
    assert.equal(Math.hypot(input.moveRaw.x, input.moveRaw.y), 0);
    assert.equal(input.snapshot({ x: 422, y: 195 }).firing, false);
    pointer(canvas, 'pointerdown', 2, 560, 130);
    assert.equal(aim.style.left, '560px');
    assert.equal(aim.style.top, '130px');
    assert.equal(input.touchAimFiring, false);
    pointer(win, 'pointermove', 1, 333, 160);
    pointer(win, 'pointermove', 2, 560, 97);
    assert.ok(input.moveRaw.x > .99);
    assert.ok(input.aimRaw.y < -.99);
    assert.equal(input.touchAimFiring, true);
    pointer(win, 'pointerup', 1, 333, 160);
    assert.equal(move.classList.contains('active'), false);
    assert.equal(input.moveRaw.x, 0);
    assert.equal(input.touchAimFiring, true);
    pointer(win, 'pointerup', 2, 560, 97);
    assert.equal(aim.classList.contains('active'), false);
    assert.equal(input.touchAimFiring, false);
    assert.equal(canvas.captured.size, 0);
    pointer(canvas, 'pointerdown', 3, 150, 240);
    assert.equal(move.style.left, '150px');
    assert.equal(move.style.top, '240px');
  });
}

test('extra fingers cannot steal roles or release another finger, even across the center', (t) => {
  const { canvas, move, input, pointer, win } = fixture(t);
  pointer(canvas, 'pointerdown', 1, 200, 200);
  pointer(canvas, 'pointerdown', 3, 320, 210);
  pointer(win, 'pointerup', 3, 320, 210);
  assert.equal(move.style.left, '200px');
  assert.ok(move.classList.contains('active'));
  pointer(win, 'pointermove', 1, 600, 200);
  assert.equal(input.moveRaw.x, 1);
  assert.equal(input.touchAimActive, false);
  assert.equal(input.pointerFire.down, false);
});

for (const eventType of ['pointercancel', 'lostpointercapture']) {
  test(`${eventType} stops movement and firing`, (t) => {
    const { canvas, move, aim, input, pointer, win } = fixture(t);
    pointer(canvas, 'pointerdown', 1, 200, 200);
    pointer(canvas, 'pointerdown', 2, 600, 200);
    pointer(win, 'pointermove', 1, 240, 200);
    pointer(win, 'pointermove', 2, 640, 200);
    input.snapshot({ x: 422, y: 195 });
    const target = eventType === 'lostpointercapture' ? canvas : win;
    pointer(target, eventType, 1, 240, 200);
    pointer(target, eventType, 2, 640, 200);
    assert.equal(input.snapshot({ x: 422, y: 195 }).moveX, 0);
    assert.equal(input.touchAimFiring, false);
    assert.equal(move.classList.contains('active'), false);
    assert.equal(aim.classList.contains('active'), false);
  });
}

for (const reason of ['blur', 'resize', 'orientationchange', 'hidden', 'pause', 'destroy']) {
  test(`${reason} clears held sticks and stale pointer state`, (t) => {
    const { canvas, move, aim, input, pointer, win, doc, scene } = fixture(t);
    pointer(canvas, 'pointerdown', 1, 200, 200);
    pointer(canvas, 'pointerdown', 2, 600, 200);
    pointer(win, 'pointermove', 1, 240, 200);
    pointer(win, 'pointermove', 2, 640, 200);
    if (reason === 'hidden') { doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); }
    else if (reason === 'pause') { scene.paused = true; scene.events.emit('pause'); }
    else if (reason === 'destroy') input.destroy();
    else win.dispatchEvent(new Event(reason));
    const state = input.snapshot({ x: 422, y: 195 });
    assert.equal(state.moveX, 0);
    assert.equal(state.firing, false);
    assert.equal(move.classList.contains('active'), false);
    assert.equal(aim.classList.contains('active'), false);
    assert.equal(canvas.captured.size, 0);
    if (reason === 'destroy') {
      pointer(canvas, 'pointerdown', 3, 100, 100);
      assert.equal(move.classList.contains('active'), false);
    }
  });
}

test('capture failure uses window movement/release and pen follows touch controls', (t) => {
  const { canvas, input, pointer, win } = fixture(t);
  canvas.setPointerCapture = () => { throw new Error('capture unavailable'); };
  pointer(canvas, 'pointerdown', 1, 100, 100, 'pen');
  pointer(win, 'pointermove', 1, 130, 100, 'pen');
  assert.ok(input.moveRaw.x > .9);
  pointer(win, 'pointerup', 1, 130, 100, 'pen');
  assert.equal(input.moveRaw.x, 0);
});

test('paused, upgrade and ended runs reject touches and mouse firing', (t) => {
  const { canvas, move, input, pointer, scene } = fixture(t);
  for (const property of ['paused', 'choiceOpen', 'ended']) {
    scene[property] = true;
    pointer(canvas, 'pointerdown', 1, 100, 100);
    pointer(canvas, 'pointerdown', 2, 100, 100, 'mouse');
    assert.equal(move.classList.contains('active'), false);
    assert.equal(input.pointerFire.down, false);
    scene[property] = false;
  }
});

test('desktop mouse taps, keyboard movement, and ability button keep working', (t) => {
  const { canvas, move, ability, input, pointer, win } = fixture(t);
  pointer(canvas, 'pointerdown', 1, 600, 195, 'mouse');
  pointer(win, 'pointerup', 1, 600, 195, 'mouse');
  assert.equal(move.classList.contains('active'), false);
  assert.equal(input.snapshot({ x: 422, y: 195 }).firing, true);
  assert.equal(input.snapshot({ x: 422, y: 195 }).firing, false);
  input.keys = Object.fromEntries(['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT'].map((key) => [key, { isDown: key === 'D' }]));
  assert.equal(input.snapshot({ x: 422, y: 195 }).moveX, 1);
  pointer(ability, 'pointerdown', 2, 700, 100);
  assert.equal(input.snapshot({ x: 422, y: 195 }).ability, true);
  pointer(canvas, 'pointerdown', 3, 700, 100, 'mouse', 2);
  assert.equal(input.snapshot({ x: 422, y: 195 }).ability, true);
});
