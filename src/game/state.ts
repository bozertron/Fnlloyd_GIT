// !Fnlloyd Game State Machine
// Manages game phases, scoring, lives, earth health, transitions

import { GAME, SCORING, COMBO, CANVAS_W, CANVAS_H } from '../data/constants';
import { GameSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from '../data/settings';

export type GamePhase = 'START' | 'ARKANOID' | 'TRANSITION' | 'BRICKLIMINATOR' | 'CITY_DEFENSE' | 'GAMEOVER';

export interface ComboState {
  count: number;
  multiplier: number;
  timer: number;
}

export class GameState {
  phase: GamePhase = 'START';
  score = 0;
  lives = GAME.startLives;
  earthHealth = 100;
  level = 1;

  combo: ComboState = { count: 0, multiplier: 1, timer: 0 };

  // Game settings (includes EFFECT_QUALITY toggle)
  settings: GameSettings = { ...DEFAULT_SETTINGS };

  // Camera state for transition animation
  cameraScale = 1.0;
  cameraY = 0;

  // Transition animation state
  private transitionFrame = 0;
  private transitionCallback: (() => void) | null = null;

  // HUD update callback
  onHudUpdate: (() => void) | null = null;
  onPhaseChange: ((phase: GamePhase) => void) | null = null;

  reset() {
    this.phase = 'ARKANOID';
    this.score = 0;
    this.lives = GAME.startLives;
    this.earthHealth = 100;
    this.level = 1;
    this.cameraScale = 1.0;
    this.cameraY = 0;
    this.resetCombo();
    
    // Load saved settings
    this.settings = loadSettings();
  }

  // --- SCORING ---
  addScore(base: number) {
    this.score += base * this.combo.multiplier;
    this.onHudUpdate?.();
  }

  // --- COMBO ---
  hitCombo(): number {
    this.combo.count++;
    this.combo.timer = COMBO.windowFrames;

    let mult = 1;
    for (const t of COMBO.thresholds) {
      if (this.combo.count >= t.hits) mult = t.mult;
    }
    this.combo.multiplier = mult;
    return mult;
  }

  updateCombo() {
    if (this.combo.timer > 0) {
      this.combo.timer--;
      if (this.combo.timer <= 0) this.resetCombo();
    }
  }

  resetCombo() {
    this.combo.count = 0;
    this.combo.multiplier = 1;
    this.combo.timer = 0;
  }

  // --- LEVEL PROGRESSION ---
  advanceLevel(): boolean {
    if (this.level >= GAME.maxLevel) return false;
    this.level++;
    this.earthHealth = Math.min(100, this.earthHealth + GAME.earthHealOnLevel);
    this.onHudUpdate?.();
    return true;
  }

  // --- EARTH DAMAGE ---
  damageEarth(amount: number): boolean {
    this.earthHealth = Math.max(0, this.earthHealth - amount);
    this.onHudUpdate?.();
    return this.earthHealth <= 0;
  }

  // --- LIVES ---
  loseLife(): boolean {
    this.lives--;
    this.onHudUpdate?.();
    return this.lives <= 0;
  }

  // --- PHASE TRANSITIONS ---
  setPhase(phase: GamePhase) {
    this.phase = phase;
    this.onPhaseChange?.(phase);
  }

  startTransitionToBrickliminator(onComplete: () => void) {
    if (this.phase !== 'ARKANOID') return;
    this.setPhase('TRANSITION');
    this.transitionFrame = 0;
    this.transitionCallback = onComplete;
  }

  updateTransition(): boolean {
    if (this.phase !== 'TRANSITION') return false;

    this.transitionFrame += 0.02;
    this.cameraScale = 1.0 - (this.transitionFrame * 0.4);
    this.cameraY = this.transitionFrame * 150;

    if (this.transitionFrame >= 1.0) {
      this.setPhase('BRICKLIMINATOR');
      this.transitionCallback?.();
      this.transitionCallback = null;
      return true; // transition complete
    }
    return false;
  }

  returnToArkanoid() {
    this.cameraScale = 1.0;
    this.cameraY = 0;
    this.setPhase('ARKANOID');
  }

  gameOver() {
    this.setPhase('GAMEOVER');
  }

  // --- SETTINGS MANAGEMENT ---
  updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    saveSettings(this.settings);
    
    // Trigger reload if quality changed
    if (newSettings.effectQuality) {
      console.log(`🔄 Quality setting changed to: ${newSettings.effectQuality}`);
      // Note: Actual resource reload handled by ResourceLoader
    }
  }

  getEffectQuality() {
    return this.settings.effectQuality;
  }
}
