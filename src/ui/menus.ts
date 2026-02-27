// !Fnlloyd - Menu Screens
// Start screen, game over screen, fullscreen Settings panel, Studio launcher

import type { GameState } from '../game/state';
import { Studio } from './studio';
import { loadStudioSettings, saveStudioSettings, resetSettings } from '../data/settings';
import type { EffectQuality } from '../data/settings';

interface SettingsPayload { effectQuality: 'INCREDIBLE' | 'MINDBLOWING'; }

export class Menus {
  private startScreen!: HTMLElement;
  private gameOverScreen!: HTMLElement;
  private finalScoreEl!: HTMLElement;
  private finalLevelEl!: HTMLElement;
  private settingsPanel: HTMLElement | null = null;
  private qualityToggle: HTMLSelectElement | null = null;

  private onStart: (() => void) | null = null;
  private onRestart: (() => void) | null = null;
  private onSettingsChange: ((settings: SettingsPayload) => void) | null = null;
  private settingsVisible = false;

  // Studio room
  private studio: Studio = new Studio();

  init(onStart: () => void, onRestart: () => void, onSettingsChange?: (settings: SettingsPayload) => void) {
    this.onStart = onStart;
    this.onRestart = onRestart;
    this.onSettingsChange = onSettingsChange || null;

    // Initialize Studio
    this.studio.init();

    const ss = document.getElementById('startScreen');
    if (!ss) { console.error('[Menus] #startScreen not found'); return; }
    this.startScreen = ss;

    const gos = document.getElementById('gameOverScreen');
    if (!gos) { console.error('[Menus] #gameOverScreen not found'); return; }
    this.gameOverScreen = gos;

    const fs = document.getElementById('finalScore');
    if (!fs) { console.error('[Menus] #finalScore not found'); return; }
    this.finalScoreEl = fs;

    const fl = document.getElementById('finalLevel');
    if (!fl) { console.error('[Menus] #finalLevel not found'); return; }
    this.finalLevelEl = fl;

    const startBtn = document.getElementById('startBtn');
    if (!startBtn) { console.error('[Menus] #startBtn not found'); return; }

    const restartBtn = document.getElementById('restartBtn');
    if (!restartBtn) { console.error('[Menus] #restartBtn not found'); return; }

    const handleStart = (e: Event) => { e.preventDefault(); this.onStart?.(); };
    const handleRestart = (e: Event) => { e.preventDefault(); this.onRestart?.(); };

    startBtn.addEventListener('click', handleStart);
    startBtn.addEventListener('touchend', handleStart);
    restartBtn.addEventListener('click', handleRestart);
    restartBtn.addEventListener('touchend', handleRestart);

    this.createSettingsPanel();
    
    // Phase 7: Restore saved effect quality from settings
    const savedSettings = loadStudioSettings();
    this.setQuality(savedSettings.effectQuality);
  }

  // ─── Fullscreen Settings Panel ────────────────────────────────────────────────

  private createSettingsPanel() {
    const settingsBtn = document.getElementById('settingsBtn');
    if (!settingsBtn) return;

    // Fullscreen overlay
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'settingsPanel';
    Object.assign(this.settingsPanel.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(5, 5, 5, 0.98)',
      zIndex: '9999',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Poiret One', cursive",
    });

    // ── Inner card (centered content)
    const card = document.createElement('div');
    Object.assign(card.style, {
      width: '560px', maxWidth: '90vw',
      border: '2px solid #C5A028',
      borderRadius: '12px',
      padding: '40px 48px',
      background: 'rgba(5, 5, 5, 0.97)',
      boxShadow: '0 0 60px rgba(197,160,40,0.25)',
    });

    // Title
    const title = document.createElement('h1');
    title.textContent = '⚙ SETTINGS';
    Object.assign(title.style, {
      color: '#F4C430', margin: '0 0 32px',
      fontSize: '36px', letterSpacing: '8px', textAlign: 'center',
      textShadow: '0 0 20px #C5A028',
      fontFamily: "'Marcellus SC', serif",
    });
    card.appendChild(title);

    // ── Quality row
    const qualityRow = this.buildRow('EFFECT QUALITY');
    this.qualityToggle = document.createElement('select');
    this.qualityToggle.innerHTML = `
      <option value="INCREDIBLE">Incredible — Pre-rendered Sprites</option>
      <option value="MINDBLOWING">Mindblowing — Real-time GPU Particles</option>
    `;
    Object.assign(this.qualityToggle.style, {
      width: '100%', padding: '12px 14px',
      background: 'rgba(197,160,40,0.08)', border: '1px solid #C5A028',
      color: '#F4C430', borderRadius: '6px',
      fontFamily: "'Poiret One', cursive", fontSize: '15px',
    });
    this.qualityToggle.addEventListener('change', () => {
      const v = this.qualityToggle?.value as 'INCREDIBLE' | 'MINDBLOWING';
      this.onSettingsChange?.({ effectQuality: v });
      // Phase 7: Persist effectQuality to settings
      const currentSettings = loadStudioSettings();
      saveStudioSettings({ ...currentSettings, effectQuality: v });
    });
    qualityRow.appendChild(this.qualityToggle);
    card.appendChild(qualityRow);

    // ── Divider
    card.appendChild(this.buildDivider());

    // ── Studio button (big, prominent)
    const studioBtn = document.createElement('button');
    studioBtn.innerHTML = '⬛ OPEN STUDIO';
    Object.assign(studioBtn.style, {
      width: '100%', padding: '22px',
      background: 'rgba(5,5,5,0.97)',
      border: '2px solid #C5A028',
      color: '#F4C430',
      borderRadius: '8px',
      fontFamily: "'Poiret One', cursive", fontSize: '24px',
      letterSpacing: '6px', cursor: 'pointer',
      textShadow: '0 0 20px #C5A028',
      boxShadow: '0 0 30px rgba(197,160,40,0.4), inset 0 0 30px rgba(197,160,40,0.1)',
      transition: 'all 0.2s', marginBottom: '24px',
    });
    studioBtn.onmouseenter = () => {
      studioBtn.style.background = '#C5A028';
      studioBtn.style.color = '#050505';
    };
    studioBtn.onmouseleave = () => {
      studioBtn.style.background = 'rgba(5,5,5,0.97)';
      studioBtn.style.color = '#F4C430';
    };
    studioBtn.addEventListener('click', () => { this.hideSettings(); this.studio.show(); });
    studioBtn.addEventListener('touchend', () => { this.hideSettings(); this.studio.show(); });
    card.appendChild(studioBtn);

    // Sub-label for studio
    const studioSub = document.createElement('p');
    studioSub.textContent = 'particles.js  ·  FBO Three.js  ·  WindowPet  ·  3D Model Loader';
    Object.assign(studioSub.style, {
      color: 'rgba(197,160,40,0.5)', fontSize: '12px', textAlign: 'center',
      letterSpacing: '2px', margin: '-16px 0 24px',
    });
    card.appendChild(studioSub);

    // ── Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'CLOSE';
    Object.assign(closeBtn.style, {
      width: '100%', padding: '14px',
      background: 'transparent', border: '2px solid #C5A028',
      color: '#C5A028', borderRadius: '6px',
      fontFamily: "'Poiret One', cursive", fontSize: '18px',
      letterSpacing: '4px', cursor: 'pointer',
      transition: 'all 0.2s',
    });
    closeBtn.onmouseenter = () => { closeBtn.style.background = '#C5A028'; closeBtn.style.color = '#050505'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#C5A028'; };
    closeBtn.addEventListener('click', () => this.hideSettings());
    card.appendChild(closeBtn);

    // ── RESET ALL SETTINGS button (Phase 7 - danger red)
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '⚠ RESET ALL SETTINGS';
    Object.assign(resetBtn.style, {
      width: '100%', padding: '10px',
      background: 'transparent', border: '1px solid #ff3366',
      color: '#ff3366', borderRadius: '6px',
      fontFamily: "'Poiret One', cursive", fontSize: '14px',
      letterSpacing: '2px', cursor: 'pointer',
      marginTop: '12px', transition: 'all 0.2s',
    });
    resetBtn.onmouseenter = () => { resetBtn.style.background = '#ff3366'; resetBtn.style.color = '#fff'; };
    resetBtn.onmouseleave = () => { resetBtn.style.background = 'transparent'; resetBtn.style.color = '#ff3366'; };
    resetBtn.addEventListener('click', () => {
      if (window.confirm('Reset all Studio settings to defaults?')) {
        resetSettings();
        location.reload();
      }
    });
    card.appendChild(resetBtn);

    this.settingsPanel.appendChild(card);

    // Click outside card to close
    this.settingsPanel.addEventListener('click', (e) => {
      if (e.target === this.settingsPanel) this.hideSettings();
    });

    document.body.appendChild(this.settingsPanel);

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!this.settingsVisible) return;
        this.hideSettings();
      }
    });

    // Wire settings button
    settingsBtn.addEventListener('click', () => this.showSettings());
    settingsBtn.addEventListener('touchend', () => this.showSettings());
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private buildRow(label: string): HTMLElement {
    const row = document.createElement('div');
    row.style.marginBottom = '20px';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    Object.assign(lbl.style, {
      display: 'block', color: '#C5A028',
      fontSize: '13px', letterSpacing: '3px', marginBottom: '10px',
      fontFamily: "'Marcellus SC', serif",
    });
    row.appendChild(lbl);
    return row;
  }

  private buildDivider(): HTMLElement {
    const d = document.createElement('hr');
    Object.assign(d.style, {
      border: 'none', borderTop: '1px solid rgba(197,160,40,0.3)',
      margin: '28px 0',
    });
    return d;
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

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

  showSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'flex';
      this.settingsVisible = true;
    }
  }

  hideSettings() {
    if (this.settingsPanel) {
      this.settingsPanel.style.display = 'none';
      this.settingsVisible = false;
    }
  }

  setQuality(value: 'INCREDIBLE' | 'MINDBLOWING') {
    if (this.qualityToggle) this.qualityToggle.value = value;
  }
}
