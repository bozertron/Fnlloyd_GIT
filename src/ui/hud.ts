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
    this.scoreEl = document.getElementById('scoreDisplay')!;
    this.levelEl = document.getElementById('levelDisplay')!;
    this.comboEl = document.getElementById('comboDisplay')!;
    this.earthEl = document.getElementById('earthHealthDisplay')!;
    this.livesEl = document.getElementById('livesDisplay')!;
    this.phaseAlertEl = document.getElementById('phaseAlert')!;
    this.levelAlertEl = document.getElementById('levelAlert')!;
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
    if (state.combo.multiplier > 1) {
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
