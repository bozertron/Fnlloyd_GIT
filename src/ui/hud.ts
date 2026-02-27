// !Fnlloyd - HUD (Heads-Up Display)
// All Poiret One font. Score, level, combo, earth health, lives.

import type { GameState } from '../game/state';

export class HUD {
  private scoreEl!: HTMLElement;
  private levelEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private earthEl!: HTMLElement;
  private livesEl!: HTMLElement;
  private phaseAlertEl!: HTMLElement;
  private levelAlertEl!: HTMLElement;

  init() {
    const scoreEl = document.getElementById('scoreDisplay');
    if (!scoreEl) { console.error('[HUD] Missing element: #scoreDisplay'); return; }
    this.scoreEl = scoreEl;

    const levelEl = document.getElementById('levelDisplay');
    if (!levelEl) { console.error('[HUD] Missing element: #levelDisplay'); return; }
    this.levelEl = levelEl;

    const comboEl = document.getElementById('comboDisplay');
    if (!comboEl) { console.error('[HUD] Missing element: #comboDisplay'); return; }
    this.comboEl = comboEl;

    const earthEl = document.getElementById('earthHealthDisplay');
    if (!earthEl) { console.error('[HUD] Missing element: #earthHealthDisplay'); return; }
    this.earthEl = earthEl;

    const livesEl = document.getElementById('livesDisplay');
    if (!livesEl) { console.error('[HUD] Missing element: #livesDisplay'); return; }
    this.livesEl = livesEl;

    const phaseAlertEl = document.getElementById('phaseAlert');
    if (!phaseAlertEl) { console.error('[HUD] Missing element: #phaseAlert'); return; }
    this.phaseAlertEl = phaseAlertEl;
    this.phaseAlertEl.style.transition = 'opacity 0.5s ease';

    const levelAlertEl = document.getElementById('levelAlert');
    if (!levelAlertEl) { console.error('[HUD] Missing element: #levelAlert'); return; }
    this.levelAlertEl = levelAlertEl;
    this.levelAlertEl.style.transition = 'opacity 0.5s ease';
  }

  update(state: GameState) {
    this.scoreEl.textContent = `SCORE: ${state.score}`;
    this.levelEl.textContent = `LEVEL ${state.level}`;
    this.livesEl.textContent = `LIVES: ${state.lives}`;

    const eh = this.earthEl;
    eh.textContent = `EARTH: ${state.earthHealth}%`;
    if (state.earthHealth <= 50) eh.classList.add('danger');
    else eh.classList.remove('danger');

    // Combo display
    if ((state.combo?.multiplier ?? 0) > 1) {
      this.comboEl.textContent = `\u00D7${state.combo.multiplier}`;
      this.comboEl.classList.add('active');
    } else {
      this.comboEl.classList.remove('active');
    }
  }

  showPhaseAlert() {
    this.phaseAlertEl.style.opacity = '1';
    setTimeout(() => { this.phaseAlertEl.style.opacity = '0'; }, 3000);
  }

  showLevelAlert(text: string) {
    this.levelAlertEl.textContent = text;
    this.levelAlertEl.style.opacity = '1';
    setTimeout(() => { this.levelAlertEl.style.opacity = '0'; }, 2000);
  }
}
