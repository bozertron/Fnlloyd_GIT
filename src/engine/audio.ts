// !Fnlloyd Audio Engine
// Raw Web Audio API synthesizer — no external dependencies
// Ported from fnlloyd_enhanced.html, extended with adaptive music

export class AudioEngine {
  private actx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private sequenceInterval: ReturnType<typeof setInterval> | null = null;
  private musicPlaying = false;

  // Musical scale for pitched brick sounds (C4 to C5)
  private brickScale = [261.63, 293.66, 329.63, 369.99, 415.30, 466.16, 523.25];

  // Adaptive music state
  private musicIntensity = 0; // 0 = calm, 1 = intense
  private currentPhase: 'arkanoid' | 'brickliminator' = 'arkanoid';
  private noteIndex = 0;

  // Arkanoid melody (bass notes)
  private arkanoidNotes = [65.41, 65.41, 77.78, 65.41, 98.00, 82.41, 65.41, 65.41];
  // Brickliminator melody (1.5x pitch, more urgent)
  private bricklimNotes = [98.00, 98.00, 116.54, 98.00, 146.83, 123.47, 130.81, 98.00];

  init() {
    if (this.actx) return;
    this.actx = new (window.AudioContext || (window as any).webkitAudioContext)();

    this.masterGain = this.actx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.actx.destination);

    this.musicGain = this.actx.createGain();
    this.musicGain.gain.value = 0.2;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.actx.createGain();
    this.sfxGain.gain.value = 1.0;
    this.sfxGain.connect(this.masterGain);
  }

  private playTone(freq: number, type: OscillatorType, dur: number, vol: number, slideFreq?: number, target?: GainNode) {
    if (!this.actx) return;
    const osc = this.actx.createOscillator();
    const gain = this.actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.actx.currentTime);
    if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, this.actx.currentTime + dur);

    gain.gain.setValueAtTime(vol, this.actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.actx.currentTime + dur);

    osc.connect(gain);
    gain.connect(target || this.sfxGain!);
    osc.start();
    osc.stop(this.actx.currentTime + dur);
  }

  // --- SFX ---
  thwack() { this.playTone(800, 'square', 0.1, 0.5, 200); }
  laser() { this.playTone(1200, 'sawtooth', 0.15, 0.3, 100); }
  explosion() { this.playTone(100, 'square', 0.4, 0.8, 10); }
  alarm() { this.playTone(300, 'sawtooth', 0.5, 0.5, 250); }

  powerup() {
    this.playTone(400, 'sine', 0.1, 0.5, 800);
    setTimeout(() => this.playTone(800, 'sine', 0.2, 0.5, 1200), 100);
  }

  levelUp() {
    [400, 500, 600, 800].forEach((f, i) =>
      setTimeout(() => this.playTone(f, 'sine', 0.15, 0.4), i * 100)
    );
  }

  brickHit(row: number) {
    const idx = Math.min(row, this.brickScale.length - 1);
    const freq = this.brickScale[this.brickScale.length - 1 - idx];
    this.playTone(freq, 'triangle', 0.12, 0.4);
  }

  comboHit(multiplier: number) {
    const freq = 300 + (multiplier * 100);
    this.playTone(freq, 'sine', 0.08, 0.3, freq * 1.5);
  }

  // Shield activation
  shieldUp() {
    this.playTone(600, 'sine', 0.3, 0.3, 900);
  }

  // Shield break
  shieldBreak() {
    this.playTone(400, 'square', 0.2, 0.5, 100);
  }

  // Brickliminator shape launch
  shapeLaunch() {
    this.playTone(500, 'square', 0.08, 0.3, 800);
  }

  // Line clear (big)
  lineClear(combo: number) {
    const baseFreq = 400 + combo * 100;
    for (let i = 0; i < Math.min(combo + 1, 4); i++) {
      setTimeout(() => this.playTone(baseFreq + i * 100, 'sine', 0.2, 0.5), i * 80);
    }
    this.explosion();
  }

  // --- ADAPTIVE MUSIC ---
  startMusic() {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.noteIndex = 0;

    this.sequenceInterval = setInterval(() => {
      if (!this.musicPlaying) return;

      const notes = this.currentPhase === 'brickliminator' ? this.bricklimNotes : this.arkanoidNotes;
      const freq = notes[this.noteIndex % notes.length];

      // Base melody
      this.playTone(freq, 'sawtooth', 0.2, 0.15, undefined, this.musicGain!);

      // Harmony layer (higher intensity = more layers)
      if (this.musicIntensity > 0.3) {
        this.playTone(freq * 1.5, 'sine', 0.15, 0.08 * this.musicIntensity, undefined, this.musicGain!);
      }
      if (this.musicIntensity > 0.6) {
        this.playTone(freq * 2, 'triangle', 0.1, 0.05 * this.musicIntensity, undefined, this.musicGain!);
      }

      this.noteIndex++;
    }, 250);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.sequenceInterval) {
      clearInterval(this.sequenceInterval);
      this.sequenceInterval = null;
    }
  }

  setPhase(phase: 'arkanoid' | 'brickliminator') {
    this.currentPhase = phase;
  }

  setIntensity(intensity: number) {
    this.musicIntensity = Math.max(0, Math.min(1, intensity));
  }

  // --- VOLUME CONTROLS ---
  setMasterVolume(vol: number) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  setSfxVolume(vol: number) {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  setMusicVolume(vol: number) {
    if (this.musicGain) this.musicGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  // Duck music for voice lines
  duckMusic() {
    if (this.musicGain) {
      this.musicGain.gain.linearRampToValueAtTime(0.08, this.actx!.currentTime + 0.1);
      setTimeout(() => {
        if (this.musicGain) this.musicGain.gain.linearRampToValueAtTime(0.2, this.actx!.currentTime + 0.3);
      }, 2000);
    }
  }
}
