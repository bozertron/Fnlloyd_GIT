// !Fnlloyd Settings
// Both Game Settings and Studio Settings persisted to localStorage

// ============================================================================
// EFFECT QUALITY (shared between game and studio)
// ============================================================================

/**
 * Effect quality setting
 */
export type EffectQuality = 'INCREDIBLE' | 'MINDBLOWING';

// ============================================================================
// GAME SETTINGS (original)
// ============================================================================

export interface GameSettings {
  effectQuality: EffectQuality;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  motionBlur: boolean;
}

// Default game settings
export const DEFAULT_SETTINGS: GameSettings = {
  effectQuality: 'INCREDIBLE',
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  screenShake: true,
  motionBlur: true,
};

const GAME_STORAGE_KEY = 'fnlloyd_settings';

/**
 * Load game settings from localStorage
 */
export function loadGameSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(GAME_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save game settings to localStorage
 */
export function saveGameSettings(settings: GameSettings) {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(settings));
    console.log('💾 Settings saved');
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
}

/**
 * Get quality description
 */
export function getQualityDescription(quality: EffectQuality): string {
  switch (quality) {
    case 'INCREDIBLE':
      return 'Pre-rendered sprite sheets for maximum visual fidelity';
    case 'MINDBLOWING':
      return 'Real-time GPU particle computation';
    default:
      return 'Unknown quality';
  }
}

// Alias for backwards compatibility
export const loadSettings = loadGameSettings;
export const saveSettings = saveGameSettings;

// ============================================================================
// STUDIO SETTINGS (Phase 7 - new)
// ============================================================================

/**
 * All Studio settings that can be persisted to localStorage
 */
export interface StudioSettings {
  // FBO Particles (Three.js)
  fboPointSize: number;
  fboOpacity: number;
  fboFrequency: number;
  fboAmplitude: number;
  fboMaxDistance: number;
  fboColor: string;

  // particles.js (Background)
  pjsCount: number;
  pjsParticleSize: number;
  pjsParticleOpacity: number;
  pjsColor: string;
  pjsLines: boolean;
  pjsAttract: boolean;

  // WindowPet (Sprite Layer)
  petIndex: number;
  petScale: number;
  petVisible: boolean;
  petYPercent: number;

  // Panel layout
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Global
  effectQuality: EffectQuality;
}

/**
 * Default Studio settings
 */
export const STUDIO_DEFAULTS: StudioSettings = {
  // FBO Particles
  fboPointSize: 80,
  fboOpacity: 0.9,
  fboFrequency: 0.33,
  fboAmplitude: 4.5,
  fboMaxDistance: 7.2,
  fboColor: '#C5A028',

  // particles.js
  pjsCount: 120,
  pjsParticleSize: 3,
  pjsParticleOpacity: 0.7,
  pjsColor: '#C5A028',
  pjsLines: true,
  pjsAttract: true,

  // WindowPet
  petIndex: 0,
  petScale: 1,
  petVisible: true,
  petYPercent: 72,

  // Panel layout
  leftPanelOpen: true,
  rightPanelOpen: true,

  // Global
  effectQuality: 'INCREDIBLE',
};

const STUDIO_STORAGE_KEY = 'fnlloyd-studio-settings';

/**
 * Debounce utility - delays function execution until after ms milliseconds
 * of no new calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Load Studio settings from localStorage
 * Merges with defaults to handle new settings added in future versions
 */
export function loadStudioSettings(): StudioSettings {
  try {
    const saved = localStorage.getItem(STUDIO_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Spread with defaults ensures new settings keys don't break old saves
      return { ...STUDIO_DEFAULTS, ...parsed };
    }
  } catch (error) {
    console.warn('[Settings] Failed to load studio settings:', error);
  }
  return { ...STUDIO_DEFAULTS };
}

/**
 * Save Studio settings to localStorage
 */
export function saveStudioSettings(settings: StudioSettings): void {
  try {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(settings));
    console.log('[Studio Settings] Saved to localStorage');
  } catch (error) {
    console.warn('[Settings] Failed to save studio settings:', error);
  }
}

/**
 * Reset Studio settings to defaults
 * Clears localStorage and returns default settings object
 */
export function resetSettings(): StudioSettings {
  try {
    localStorage.removeItem(STUDIO_STORAGE_KEY);
    console.log('[Studio Settings] Reset to defaults');
  } catch (error) {
    console.warn('[Settings] Failed to clear studio settings:', error);
  }
  return { ...STUDIO_DEFAULTS };
}