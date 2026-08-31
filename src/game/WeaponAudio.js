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

export function weaponSoundProfile(weaponId, skin = null) {
  const base = WEAPON_SOUND_PROFILES[weaponId] || WEAPON_SOUND_PROFILES.revolver;
  if (!skin) return base;
  const pitch = skin.weaponPitch || 1;
  return {
    tone: { ...base.tone, from: base.tone.from * pitch, to: base.tone.to * pitch, gain: base.tone.gain * 1.08 },
    noise: { ...base.noise, frequency: base.noise.frequency * pitch, gain: base.noise.gain * .92 },
    premium: { from: 420 * pitch, to: 760 * pitch, duration: .11, gain: .045 },
  };
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
    this.lastVoiceAt = 0;
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

  play(weaponId, skin = null) {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.master) return false;
    const profile = weaponSoundProfile(weaponId, skin);
    const now = context.currentTime;
    this.playTone(profile.tone, now);
    this.playNoise(profile.noise, now);
    if (profile.premium) this.playPremiumTone(profile.premium, now);
    return true;
  }

  playVoice(event, skin) {
    if (!skin) return false;
    if (event === 'intro') return false;
    const nowMs = Date.now();
    if (nowMs - this.lastVoiceAt < 650) return false;
    this.lastVoiceAt = nowMs;
    if (!this.context || this.context.state !== 'running' || !this.master) return false;
    const base = event === 'dash' ? 190 : event === 'hurt' ? 125 : 165;
    const pitch = skin.voicePitch || 1;
    this.playVocalCue(base * pitch, event === 'hurt' ? .16 : .22, event === 'hurt' ? .085 : .06);
    return true;
  }

  playPremiumTone(profile, now) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(profile.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.to, now + profile.duration);
    envelope(gain.gain, now, profile.gain, profile.duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + profile.duration + .01);
  }

  playVocalCue(frequency, duration, gainValue) {
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .68, now + duration);
    filter.type = 'bandpass';
    filter.frequency.value = frequency * 4.4;
    filter.Q.value = 1.4;
    envelope(gain.gain, now, gainValue, duration);
    oscillator.connect(filter).connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + .01);
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
