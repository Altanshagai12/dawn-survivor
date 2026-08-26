export const WEAPON_SOUND_PROFILES = Object.freeze({
  revolver: Object.freeze({
    tone: Object.freeze({ type: 'square', from: 210, to: 78, duration: .075, gain: .16 }),
    noise: Object.freeze({ frequency: 1500, q: 2.6, duration: .055, gain: .12 }),
  }),
  shotgun: Object.freeze({
    tone: Object.freeze({ type: 'triangle', from: 105, to: 43, duration: .14, gain: .2 }),
    noise: Object.freeze({ frequency: 620, q: .8, duration: .13, gain: .2 }),
  }),
  crossbow: Object.freeze({
    tone: Object.freeze({ type: 'triangle', from: 720, to: 150, duration: .1, gain: .11 }),
    noise: Object.freeze({ frequency: 2600, q: 3.8, duration: .045, gain: .07 }),
  }),
  flame: Object.freeze({
    tone: Object.freeze({ type: 'sawtooth', from: 120, to: 58, duration: .16, gain: .07 }),
    noise: Object.freeze({ frequency: 880, q: .7, duration: .17, gain: .16 }),
  }),
});

export function weaponSoundProfile(weaponId) {
  return WEAPON_SOUND_PROFILES[weaponId] || WEAPON_SOUND_PROFILES.revolver;
}

function envelope(parameter, now, gain, duration) {
  parameter.setValueAtTime(.0001, now);
  parameter.exponentialRampToValueAtTime(Math.max(.0001, gain), now + .006);
  parameter.exponentialRampToValueAtTime(.0001, now + duration);
}

export class WeaponAudio {
  constructor(environment = globalThis) {
    this.host = environment.window || environment;
    this.AudioContext = environment.AudioContext || environment.webkitAudioContext
      || this.host.AudioContext || this.host.webkitAudioContext;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.unlockFromGesture = () => { this.unlock(); };
    this.host.addEventListener?.('pointerdown', this.unlockFromGesture, { capture: true, once: true });
    this.host.addEventListener?.('keydown', this.unlockFromGesture, { capture: true, once: true });
  }

  unlock() {
    if (!this.AudioContext) return false;
    try {
      if (!this.context) {
        this.context = new this.AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = .48;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  play(weaponId) {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.master) return false;
    const profile = weaponSoundProfile(weaponId);
    const now = context.currentTime;
    this.playTone(profile.tone, now);
    this.playNoise(profile.noise, now);
    return true;
  }

  playTone(profile, now) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.to, now + profile.duration);
    envelope(gain.gain, now, profile.gain, profile.duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + profile.duration + .01);
  }

  playNoise(profile, now) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.getNoiseBuffer();
    filter.type = 'bandpass';
    filter.frequency.value = profile.frequency;
    filter.Q.value = profile.q;
    envelope(gain.gain, now, profile.gain, profile.duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + profile.duration + .01);
  }

  getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.ceil(this.context.sampleRate * .2);
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
    this.context?.close?.().catch(() => {});
    this.context = null;
  }
}
