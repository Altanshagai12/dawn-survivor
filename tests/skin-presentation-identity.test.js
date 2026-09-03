import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { PREMIUM_SKINS, SKINS_BY_HERO } from '../src/data/skins.js';
import { weaponSkinOptions } from '../src/data/weaponSkins.js';
import { PremiumWeaponAudio } from '../src/game/PremiumWeaponAudio.js';
import { AUDIO_BANK_FILES, AUDIO_SPRITE_CLIPS } from '../src/game/WeaponAudioProfiles.js';
import { WeaponLoadoutController } from '../src/ui/WeaponLoadoutController.js';

const skins = Object.values(PREMIUM_SKINS);
const weaponIds = ['revolver', 'shotgun', 'crossbow', 'flame'];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const assetUrl = (asset) => new URL(`../${asset.replace(/^\.\//, '').split('?')[0]}`, import.meta.url);

function pcmWave(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  assert.equal(bytes.toString('ascii', 12, 16), 'fmt ');
  assert.equal(bytes.readUInt16LE(20), 1, 'PCM audio');
  assert.equal(bytes.readUInt16LE(22), 1, 'mono audio');
  assert.equal(bytes.readUInt32LE(24), 44100);
  assert.equal(bytes.readUInt16LE(34), 16);
  assert.equal(bytes.toString('ascii', 36, 40), 'data');
  assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
  return { pcm: bytes.subarray(44), duration: (bytes.length - 44) / 88200 };
}

test('each gun exposes the eight existing hero-pack skins plus original', () => {
  assert.equal(skins.length, 8);
  assert.deepEqual(Object.values(SKINS_BY_HERO).map((entries) => entries.length), [2, 2, 2, 2]);
  for (const weaponId of weaponIds) {
    const options = weaponSkinOptions({}, weaponId);
    assert.equal(options[0], null);
    assert.deepEqual(options.slice(1), skins);
  }
});

test('all skin weapon and event banks have distinct non-silent PCM and valid sprite clips', async () => {
  const hashes = new Set();
  const shotHashes = new Set();
  assert.equal(new Set(skins.map((skin) => skin.audioBank)).size, skins.length);
  for (const skin of skins) for (const bank of AUDIO_BANK_FILES) {
    const { pcm, duration } = pcmWave(await readFile(assetUrl(`${skin.audioBank}/${bank}.wav`)));
    const hash = digest(pcm);
    assert.ok(!hashes.has(hash), `${skin.id}/${bank} must not alias another audio bank`);
    hashes.add(hash);
    for (const [key, clip] of Object.entries(AUDIO_SPRITE_CLIPS).filter(([, entry]) => entry.bank === bank)) {
      assert.ok(clip.offset + clip.duration <= duration + 1 / 44100, `${skin.id}/${key} fits its bank`);
      const samples = pcm.subarray(Math.round(clip.offset * 44100) * 2,
        Math.round((clip.offset + clip.duration) * 44100) * 2);
      let squareSum = 0;
      for (let index = 0; index < samples.length; index += 2) squareSum += (samples.readInt16LE(index) / 32768) ** 2;
      assert.ok(Math.sqrt(squareSum / (samples.length / 2)) > .01, `${skin.id}/${key} is audible PCM`);
      if (weaponIds.includes(bank)) {
        const shotHash = digest(samples);
        assert.ok(!shotHashes.has(shotHash), `${skin.id}/${key} must be a distinct shot variant`);
        shotHashes.add(shotHash);
      }
    }
  }
  assert.equal(hashes.size, 40, '32 gun banks and 8 event banks');
  assert.equal(shotHashes.size, 96, '3 variants for each of 32 skin/gun combinations');
});

test('each skin has unique decoded VFX art and distinct projectile cells for all four guns', async () => {
  const atlasHashes = new Set();
  const projectileHashes = new Set();
  assert.equal(new Set(skins.map((skin) => skin.vfxKey)).size, skins.length);
  for (const skin of skins) {
    const image = sharp(fileURLToPath(assetUrl(skin.vfxAtlas)));
    const atlas = await image.clone().ensureAlpha().raw().toBuffer();
    const atlasHash = digest(atlas);
    assert.ok(!atlasHashes.has(atlasHash), `${skin.id} must have its own VFX artwork`);
    atlasHashes.add(atlasHash);
    for (const [weaponId, frame] of Object.entries({ revolver: 5, shotgun: 6, crossbow: 3, flame: 4 })) {
      const pixels = await image.clone().extract({
        left: frame % 4 * 256, top: Math.floor(frame / 4) * 256, width: 256, height: 256,
      }).ensureAlpha().raw().toBuffer();
      let solid = 0;
      for (let index = 3; index < pixels.length; index += 4) if (pixels[index] >= 128) solid += 1;
      assert.ok(solid > 100, `${skin.id}/${weaponId} has visible projectile art`);
      const projectileHash = digest(pixels);
      assert.ok(!projectileHashes.has(projectileHash), `${skin.id}/${weaponId} must not alias another projectile`);
      projectileHashes.add(projectileHash);
    }
  }
  assert.equal(atlasHashes.size, 8);
  assert.equal(projectileHashes.size, 32);
});

test('loadout audition and in-game shot playback use the equipped gun skin bank', async (t) => {
  const previousAudio = globalThis.Audio;
  globalThis.Audio = class {
    constructor(src) { this.src = src; }
    play() { return Promise.resolve(); }
    pause() {}
  };
  t.after(() => { globalThis.Audio = previousAudio; });
  for (const skin of skins) {
    const requests = [];
    const sources = [];
    const audio = new PremiumWeaponAudio({
      environment: {}, voiceCap: 16,
      fetcher: async (url) => {
        requests.push(url);
        const bytes = await readFile(assetUrl(url));
        return { ok: true, arrayBuffer: async () => Uint8Array.from(bytes).buffer };
      },
    });
    audio.preloadSkin(skin);
    audio.weaponBus = {};
    audio.context = {
      state: 'running',
      decodeAudioData: async (bytes) => {
        const wave = pcmWave(Buffer.from(bytes));
        return { duration: wave.duration, hash: digest(wave.pcm) };
      },
      createGain: () => ({ gain: {}, connect() {} }),
      createBufferSource: () => {
        const source = { playbackRate: {}, connect() {}, stop() {},
          start(_when, offset, duration) { sources.push({ hash: this.buffer.hash, offset, duration }); } };
        return source;
      },
    };
    audio.playWeaponBody = () => {};
    audio.playSweetener = () => assert.fail('loaded skin audio should not use synthesized fallback');
    await audio.decodePending();
    assert.deepEqual(requests.map((url) => url.split('?')[0]),
      AUDIO_BANK_FILES.map((bank) => `${skin.audioBank}/${bank}.wav`));
    for (const weaponId of weaponIds) {
      const controller = { profile: { equippedWeaponSkins: { [weaponId]: skin.id } },
        previewSkin: () => skin,
        stopAudio: WeaponLoadoutController.prototype.stopAudio };
      WeaponLoadoutController.prototype.audition.call(controller, weaponId);
      assert.equal(controller.audio.src.split('?')[0], `${skin.audioBank}/${weaponId}.wav`);
      const expectedHash = audio.buffers.get(weaponId).hash;
      for (const variant of [1, 2, 0]) {
        assert.equal(audio.play(weaponId, skin), true);
        const clip = AUDIO_SPRITE_CLIPS[`${weaponId}-${variant}`];
        const actual = sources.at(-1);
        assert.equal(actual.hash, expectedHash);
        assert.equal(actual.offset, clip.offset);
        assert.ok(Math.abs(actual.duration - clip.duration) <= 1 / 44100);
      }
    }
    audio.context = null;
    audio.destroy();
  }
});
