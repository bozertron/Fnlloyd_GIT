// ============================================
// SCORE SYSTEM - Popups & Combo Display
// ============================================
import { CONSTANTS } from './constants.js';
import { gameState } from './state.js';

/**
 * Show floating score popup at brick location
 */
export function showScorePopup(points, x, y) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    popup.style.left = `${(x + CONSTANTS.GAME_WIDTH / 2)}px`;
    popup.style.top = `${(CONSTANTS.GAME_HEIGHT / 2 - y)}px`;
    document.body.appendChild(popup);
    
    setTimeout(() => popup.remove(), 1000);
}

/**
 * Update combo display when combo > 1
 */
export function updateComboDisplay() {
    if (gameState.combo > 1) {
        const comboDisplay = document.getElementById('combo-display');
        if (comboDisplay) {
            comboDisplay.textContent = `x${gameState.combo}`;
            comboDisplay.classList.add('visible');
            setTimeout(() => {
                if (comboDisplay) comboDisplay.classList.remove('visible');
            }, 500);
        }
    }
}

/**
 * Update HUD combo multiplier text
 */
export function updateComboMultiplier(comboMultiplier) {
    const comboElement = document.getElementById('combo');
    if (comboElement) {
        comboElement.textContent = `x${comboMultiplier}`;
    }
}
