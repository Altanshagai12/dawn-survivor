import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const RATE = 44100;
const skins = {
  astral: { pitch: 1.16, resonance: 1180, sub: .12, air: .22, echo: .095 },
  bloodmoon: { pitch: .78, resonance: 520, sub: .28, air: .08, echo: .13 },
  sunforge: { pitch: 1.03, resonance: 840, sub: .18, air: .31, echo: .075 },
  'void-lotus': { pitch: 1.28, resonance: 1360, sub: .15, air: .17, echo: .16 },
  'celestial-dragon': { pitch: 1.12, resonance: 1260, sub: .18, air: .28, echo: .11 },
  'obsidian-eclipse': { pitch: .72, resonance: 430, sub: .34, air: .07, echo: .15 },
  'prismatic-tempest': { pitch: 1.2, resonance: 1540, sub: .16, air: .38, echo: .085 },
  'chrono-kitsune': { pitch: 1.34, resonance: 1680, sub: .14, air: .2, echo: .18 },
};
const weapons = {
  revolver: { duration: .3, base: 185, sweep: 11, noise: .34, decay: 14, click: 1.2, thump: .48, crack: .5, tail: .12, drive: 1.25 },
  shotgun: { duration: .54, base: 68, sweep: 4, noise: .86, decay: 7, click: 1.4, thump: .9, crack: .7, tail: .22, drive: 1.4 },
  crossbow: { duration: .37, base: 510, sweep: 15, noise: .26, decay: 11, click: 1.05, thump: .24, crack: 1.1, tail: .15, drive: 1.2 },
  flame: { duration: .58, base: 92, sweep: 2.2, noise: .72, decay: 5.8, click: .55, thump: .6, crack: .3, tail: .28, drive: 1.3 },
};
const events = {
  impact: { duration: .24, base: 92, sweep: 8, noise: .52, decay: 15, click: .85 },
  reload: { duration: .18, base: 540, sweep: 2, noise: .13, decay: 22, click: 1.15 },
  ricochet: { duration: .21, base: 880, sweep: 12, noise: .12, decay: 18, click: .65 },
  elemental: { duration: .36, base: 230, sweep: 4, noise: .36, decay: 9, click: .4 },
  upgrade: { duration: .52, base: 330, sweep: -2.2, noise: .09, decay: 6.5, click: .35 },
  dash: { duration: .29, base: 280, sweep: -6, noise: .26, decay: 11, click: .48 },
};

function randomSource(seedValue) {
  let seed = seedValue >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff * 2 - 1;
  };
}

function synthesize(definition, skin, variant, seed) {
  const length = Math.ceil(definition.duration * RATE);
  const samples = new Float32Array(length);
  const random = randomSource(seed);
  let noiseState = 0;
  const base = definition.base * skin.pitch * (1 + (variant - .5) * .035);
  for (let index = 0; index < length; index += 1) {
    const time = index / RATE;
    const phase = Math.PI * 2 * base * time * Math.exp(-definition.sweep * time * .17);
    const body = Math.sin(phase) * Math.exp(-time * definition.decay);
    const sub = Math.sin(phase * .48) * Math.exp(-time * definition.decay * .72) * skin.sub;
    const thump = Math.sin(phase * .31) * Math.exp(-time * definition.decay * .45)
      * (definition.thump || .18);
    const metal = (Math.sin(Math.PI * 2 * skin.resonance * time)
      + .46 * Math.sin(Math.PI * 2 * skin.resonance * 1.617 * time))
      * Math.exp(-time * (definition.decay * .75 + 3)) * .18;
    noiseState += (random() - noiseState) * Math.min(.92, .18 + skin.air);
    const noise = noiseState * definition.noise * Math.exp(-time * definition.decay * .82);
    const click = time < .012 ? random() * definition.click * (1 - time / .012) : 0;
    const crack = random() * Math.exp(-time * 62) * (definition.crack || .2);
    const tail = noiseState * Math.exp(-time / Math.max(.04, definition.tail || .08)) * .24;
    const mixed = body * .68 + sub + thump + metal + noise + click * .5 + crack + tail;
    samples[index] = Math.tanh(mixed * (definition.drive || 1.1));
  }
  const delay = Math.max(1, Math.round(RATE * skin.echo));
  for (let index = delay; index < samples.length; index += 1) samples[index] += samples[index - delay] * .18;
  let peak = .001;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const gain = .88 / peak;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= gain;
  return samples;
}

function wav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(RATE, 24); buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  return buffer;
}

const root = path.resolve('assets/skins/premium/audio');
const GAP_SECONDS = .03;

function joinSegments(segments) {
  const gap = new Float32Array(Math.round(RATE * GAP_SECONDS));
  const length = segments.reduce((sum, segment) => sum + segment.length, 0)
    + gap.length * Math.max(0, segments.length - 1);
  const output = new Float32Array(length);
  let offset = 0;
  segments.forEach((segment, index) => {
    output.set(segment, offset);
    offset += segment.length;
    if (index + 1 < segments.length) offset += gap.length;
  });
  return output;
}

for (const [skinId, skin] of Object.entries(skins)) {
  const directory = path.join(root, skinId);
  await mkdir(directory, { recursive: true });
  for (const [weaponId, definition] of Object.entries(weapons)) {
    const variants = [];
    for (let variant = 0; variant < 3; variant += 1) {
      variants.push(synthesize(definition, skin, variant,
        skinId.length * 9001 + weaponId.length * 701 + variant));
    }
    await writeFile(path.join(directory, `${weaponId}.wav`), wav(joinSegments(variants)));
  }
  const eventSegments = [];
  for (const [weaponId, weapon] of Object.entries(weapons)) {
    for (const eventId of ['impact', 'reload']) {
      const definition = {
        ...events[eventId],
        base: events[eventId].base * Math.max(.72, Math.min(1.35, weapon.base / 180)),
        noise: events[eventId].noise * (weaponId === 'shotgun' || weaponId === 'flame' ? 1.25 : .86),
      };
      for (let variant = 0; variant < 2; variant += 1) {
        eventSegments.push(synthesize(definition, skin, variant,
          skinId.length * 7103 + weaponId.length * 503 + eventId.length * 307 + variant));
      }
    }
  }
  for (const [eventId, definition] of Object.entries(events)) {
    if (eventId === 'impact' || eventId === 'reload') continue;
    for (let variant = 0; variant < 2; variant += 1) {
      eventSegments.push(synthesize(definition, skin, variant,
        skinId.length * 5101 + eventId.length * 401 + variant));
    }
  }
  await writeFile(path.join(directory, 'events.wav'), wav(joinSegments(eventSegments)));
}
console.log(`Generated five-file premium audio sprite banks in ${root}`);
