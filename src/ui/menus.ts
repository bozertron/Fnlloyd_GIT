// !Fnlloyd - Menu Screens
// Start screen, game over screen, pause (future)

import type { GameState } from '../game/state';

export class Menus {
  private startScreen!: HTMLElement;
  private gameOverScreen!: HTMLElement;
  private finalScoreEl!: HTMLElement;
  private finalLevelEl!: HTMLElement;

  private onStart: (() => void) | null = null;
  private onRestart: (() => void) | null = null;

  init(onStart: () => void, onRestart: () => void) {
    this.onStart = onStart;
    this.onRestart = onRestart;

    this.startScreen = document.getElementById('startScreen')!;
    this.gameOverScreen = document.getElementById('gameOverScreen')!;
    this.finalScoreEl = document.getElementById('finalScore')!;
    this.finalLevelEl = document.getElementById('finalLevel')!;

    const startBtn = document.getElementById('startBtn')!;
    const restartBtn = document.getElementById('restartBtn')!;

    const handleStart = (e: Event) => {
      e.preventDefault();
      this.onStart?.();
    };
    const handleRestart = (e: Event) => {
      e.preventDefault();
      this.onRestart?.();
    };

    startBtn.addEventListener('click', handleStart);
    startBtn.addEventListener('touchend', handleStart);
    restartBtn.addEventListener('click', handleRestart);
    restartBtn.addEventListener('touchend', handleRestart);
  }

  hideStart() {
    this.startScreen.classList.add('hidden');
  }

  showGameOver(state: GameState) {
    this.finalScoreEl.textContent = `SCORE: ${state.score}`;
    this.finalLevelEl.textContent = `REACHED LEVEL ${state.level}`;
    this.gameOverScreen.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverScreen.classList.add('hidden');
  }
}
