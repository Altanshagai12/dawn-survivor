import {
  AUDIO_BANK_FILES, audioSpriteClip, specialAudioEvent, weaponSoundProfile,
} from './WeaponAudioProfiles.js?build=20260901b';
import { upgradePresentation } from './UpgradePresentationProfiles.js?build=20260828e';

export { weaponSoundProfile } from './WeaponAudioProfiles.js?build=20260901b';
export const MAX_SHOT_AUDIO_SOURCES = 3;

function envelope(parameter, now, gain, duration) {
  parameter.setValueAtTime(.0001, now);
  parameter.exponentialRampToValueAtTime(Math.max(.0001, gain), now + .004);
  parameter.exponentialRampToValueAtTime(.0001, now + duration);
}

export class PremiumWeaponAudio {
  constructor(options = {}) {
    const environment = options.environment || (options.AudioContext || options.window ? options : globalThis);
    this.host = environment.window || environment;
    this.AudioContext = environment.AudioContext || environment.webkitAudioContext
      || this.host.AudioContext || this.host.webkitAudioContext;
    this.fetcher = options.fetcher || this.host.fetch?.bind(this.host) || globalThis.fetch?.bind(globalThis);
    this.voiceCap = options.voiceCap || 12;
    this.context = null;
    this.lastVoiceAt = 0;
    this.pendingBuffers = new Map();
    this.buffers = new Map();
    this.variantCursor = new Map();
    this.shotCounter = 0;
    this.activeSources = new Map();
    this.skin = null;
    this.unlockFromGesture = () => { this.unlock(); };
    this.host.addEventListener?.('pointerdown', this.unlockFromGesture, { capture: true, once: true });
    this.host.addEventListener?.('keydown', this.unlockFromGesture, { capture: true, once: true });
  }

  preloadSkin(skin) {
    this.skin = skin;
    if (!skin?.audioBank || !this.fetcher) return;
    this.pendingBuffers.clear();
    this.buffers.clear();
    AUDIO_BANK_FILES.forEach((bank) => {
      this.pendingBuffers.set(bank, this.fetcher(`${skin.audioBank}/${bank}.wav?build=20260901b`)
        .then((response) => response.ok ? response.arrayBuffer() : null).catch(() => null));
    });
    if (this.context) this.decodePending();
  }

  unlock() {
    if (!this.AudioContext) return false;
    try {
      if (!this.context) this.createMix();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return true;
    } catch { return false; }
  }

  createMix() {
    this.context = new this.AudioContext();
    this.master = this.context.createGain();
    this.weaponBus = this.context.createGain();
    this.impactBus = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.master.gain.value = .58;
    this.weaponBus.gain.value = .98;
    this.impactBus.gain.value = .82;
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 8;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = .002;
    this.compressor.release.value = .12;
    this.weaponBus.connect(this.master);
    this.impactBus.connect(this.master);
    this.master.connect(this.compressor).connect(this.context.destination);
    this.decodePending();
  }

  async decodePending() {
    if (!this.context) return;
    for (const [key, pending] of this.pendingBuffers) {
      if (this.buffers.has(key)) continue;
      const bytes = await pending;
      if (!bytes || !this.context) continue;
      try { this.buffers.set(key, await this.context.decodeAudioData(bytes.slice(0))); } catch { /* synthesized fallback */ }
    }
  }

  variant(event, count) {
    const next = ((this.variantCursor.get(event) || 0) + 1) % count;
    this.variantCursor.set(event, next);
    return `${event}-${next}`;
  }

  reserveVoice(priority) {
    if (this.activeSources.size < this.voiceCap) return true;
    let victim = null;
    let lowest = Infinity;
    this.activeSources.forEach((sourcePriority, source) => {
      if (sourcePriority < lowest) { victim = source; lowest = sourcePriority; }
    });
    if (!victim || lowest >= priority) return false;
    try { victim.stop(); } catch { /* source already ended */ }
    this.activeSources.delete(victim);
    return true;
  }

  trackSource(source, priority) {
    source.onended = () => this.activeSources.delete(source);
    this.activeSources.set(source, priority);
  }

  playBuffer(key, gainValue = .72, bus = this.weaponBus, pan = 0, priority = 2, rate = 1) {
    const clip = audioSpriteClip(key);
    const buffer = this.buffers.get(clip?.bank);
    if (!buffer || !this.context || !bus || !this.reserveVoice(priority)) return false;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = gainValue;
    source.buffer = buffer;
    source.playbackRate.value = Math.max(.72, Math.min(1.36, rate));
    source.connect(gain);
    if (this.context.createStereoPanner) {
      const panner = this.context.createStereoPanner();
      panner.pan.value = Math.max(-.8, Math.min(.8, pan));
      gain.connect(panner).connect(bus);
    } else gain.connect(bus);
    this.trackSource(source, priority);
    source.start(0, clip.offset, Math.max(.01, Math.min(clip.duration, buffer.duration - clip.offset)));
    return true;
  }

  play(weaponId, skin = null, state = null) {
    if (!this.context || this.context.state !== 'running') return false;
    const profile = weaponSoundProfile(weaponId, skin, state);
    const sampled = skin && this.playBuffer(this.variant(weaponId, 3),
      .78 + Math.min(.14, (profile.powerScale || 1) * .075), this.weaponBus, 0, 3);
    if (!sampled) this.playSweetener(profile, 1);
    this.playWeaponBody(profile, sampled ? .44 : .82);
    this.shotCounter += 1;
    if (skin && profile.accents?.length && this.shotCounter % 2 === 0) {
      const elemental = profile.accents.some((family) => ['pyro', 'frost', 'electro'].includes(family));
      const event = elemental ? 'elemental' : profile.accents.includes('rapid') ? 'ricochet' : 'impact';
      this.playBuffer(this.variant(event, 2), .12 + Math.min(.1, profile.accents.length * .015), this.impactBus, 0, 0);
    }
    return true;
  }

  playImpact(bullet, state) {
    if (!this.context || this.context.state !== 'running') return false;
    const weaponId = bullet?.weaponId || state?.weapon?.id || 'revolver';
    if (this.skin && this.playBuffer(this.variant(`${weaponId}-impact`, 2), .46,
      this.impactBus, 0, 1)) return true;
    this.playNoiseBurst(520, .055, .075, this.impactBus);
    return Boolean(state);
  }

  playReload(stage, weaponId, skin, state) {
    if (!this.context || this.context.state !== 'running') return false;
    if (skin && this.playBuffer(this.variant(`${weaponId}-reload`, 2), stage === 'complete' ? .58 : .34,
      this.weaponBus, 0, 2)) return true;
    const profile = weaponSoundProfile(weaponId, skin, state);
    this.playTone({ ...profile, from: profile.from * 2.4, to: profile.from * 3.1, duration: .07, gain: .055 });
    return true;
  }

  playSpecial(event, skin, state) {
    if (!this.context || this.context.state !== 'running') return false;
    const bank = specialAudioEvent(event, state?.weapon?.id);
    if (skin && this.playBuffer(this.variant(bank, 2), event === 'explosion' ? .72 : .52,
      this.impactBus, 0, event === 'explosion' ? 3 : 2)) return true;
    const profile = weaponSoundProfile(state?.weapon?.id, skin, state);
    this.playSweetener({ ...profile, from: profile.from * 1.7, to: profile.to * .8, duration: .13 }, .55);
    return true;
  }

  playUpgrade(upgrade, skin) {
    if (!this.context || this.context.state !== 'running') return false;
    const recipe = upgradePresentation(upgrade?.id);
    if (skin && this.playBuffer(this.variant('upgrade', 2), upgrade?.type === 'tome' ? .86 : .6,
      this.impactBus, 0, 4, recipe?.audioRate || 1)) return true;
    this.playVocalCue(320 * (skin?.voicePitch || 1), .34, .06);
    return true;
  }

  playVoice(event, skin) {
    if (!skin) return false;
    if (event === 'intro') return false;
    const nowMs = Date.now();
    if (nowMs - this.lastVoiceAt < 700) return false;
    this.lastVoiceAt = nowMs;
    this.duck(360);
    if (event === 'dash' && this.playBuffer(this.variant('dash', 2), .56, this.impactBus, 0, 4)) return true;
    if (!this.context || this.context.state !== 'running') return false;
    this.playVocalCue((event === 'hurt' ? 125 : 185) * (skin.voicePitch || 1), event === 'hurt' ? .16 : .24, .075);
    return true;
  }

  duck(durationMs) {
    if (!this.context || !this.weaponBus) return;
    const now = this.context.currentTime;
    this.weaponBus.gain.cancelScheduledValues(now);
    this.weaponBus.gain.setValueAtTime(this.weaponBus.gain.value, now);
    this.weaponBus.gain.linearRampToValueAtTime(.46, now + .035);
    this.weaponBus.gain.linearRampToValueAtTime(.92, now + durationMs / 1000);
  }

  playSweetener(profile, amount = 1) {
    this.playTone(profile, amount);
    this.playNoiseBurst(profile.low || 1200, profile.duration * .65, (profile.gain || .1) * .72 * amount, this.weaponBus);
  }

  playWeaponBody(profile, amount = 1) {
    this.playTone({
      type: 'sine',
      from: Math.max(24, (profile.sub || 60) * 1.35),
      to: Math.max(20, profile.sub || 44),
      duration: profile.tail || .14,
      gain: (profile.punch || .1) * amount,
    }, 1, 1);
  }

  playTone(profile, amount = 1, priority = 0) {
    if (!this.reserveVoice(priority)) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = profile.type || 'sine';
    oscillator.frequency.setValueAtTime(Math.max(20, profile.from), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, profile.to), now + profile.duration);
    envelope(gain.gain, now, (profile.gain || .08) * amount, profile.duration);
    oscillator.connect(gain).connect(this.weaponBus);
    this.trackSource(oscillator, priority);
    oscillator.start(now); oscillator.stop(now + profile.duration + .01);
  }

  playNoiseBurst(frequency, duration, gainValue, bus, priority = 0) {
    if (!this.reserveVoice(priority)) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.getNoiseBuffer();
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = 1.2;
    envelope(gain.gain, now, gainValue, duration);
    source.connect(filter).connect(gain).connect(bus || this.impactBus);
    this.trackSource(source, priority);
    source.start(now); source.stop(now + duration + .01);
  }

  playVocalCue(frequency, duration, gainValue) {
    this.playTone({ type: 'sawtooth', from: frequency, to: frequency * .68, duration, gain: gainValue });
  }

  getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.ceil(this.context.sampleRate * .24);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = 0x51f15e;
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      channel[index] = seed / 0x7fffffff - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  destroy() {
    this.host.removeEventListener?.('pointerdown', this.unlockFromGesture, true);
    this.host.removeEventListener?.('keydown', this.unlockFromGesture, true);
    this.activeSources.forEach((_priority, source) => { try { source.stop(); } catch { /* already stopped */ } });
    this.activeSources.clear();
    this.context?.close?.().catch(() => {});
    this.context = null;
    this.buffers.clear();
    this.pendingBuffers.clear();
  }
}
