/**
 * !Fnlloyd Game Settings
 * 
 * Comprehensive game settings with localStorage persistence
 * 
 * Settings Categories:
 * - Audio: Master volume, music volume, SFX volume
 * - Graphics: Screen shake intensity, particle density, bloom
 * - Gameplay: Difficulty, ball speed, paddle sensitivity
 * - Accessibility: Text size, color blind modes
 */

// Default game settings
export const DEFAULT_GAME_SETTINGS = {
    audio: {
        masterVolume: 0.8,
        musicVolume: 0.6,
        sfxVolume: 0.8,
        voiceVolume: 0.7,
        muteAll: false
    },
    graphics: {
        screenShake: true,
        shakeIntensity: 1.0,
        particleDensity: 1.0,
        bloomEnabled: true,
        bloomIntensity: 0.5,
        vsync: true,
        targetFPS: 60
    },
    gameplay: {
        difficulty: 'normal', // 'easy' | 'normal' | 'hard' | 'nightmare'
        ballSpeed: 1.0,
        paddleSensitivity: 1.0,
        autoLaunch: false,
        showTrails: true,
        comboDisplay: true
    },
    accessibility: {
        textSize: 'medium', // 'small' | 'medium' | 'large'
        highContrast: false,
        reducedMotion: false,
        colorBlindMode: 'none' // 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
    },
    controls: {
        mouseSensitivity: 1.0,
        keyboardEnabled: true,
        touchEnabled: true
    }
};

// Difficulty modifiers
export const DIFFICULTY_MODIFIERS = {
    easy: {
        ballSpeedMultiplier: 0.8,
        paddleWidthBonus: 20,
        brickHPModifier: 0.7,
        powerUpChance: 1.3,
        lives: 5
    },
    normal: {
        ballSpeedMultiplier: 1.0,
        paddleWidthBonus: 0,
        brickHPModifier: 1.0,
        powerUpChance: 1.0,
        lives: 3
    },
    hard: {
        ballSpeedMultiplier: 1.2,
        paddleWidthBonus: -10,
        brickHPModifier: 1.3,
        powerUpChance: 0.7,
        lives: 2
    },
    nightmare: {
        ballSpeedMultiplier: 1.5,
        paddleWidthBonus: -20,
        brickHPModifier: 1.8,
        powerUpChance: 0.5,
        lives: 1
    }
};

// Storage key
const SETTINGS_KEY = 'fnlloyd_game_settings';

class GameSettingsManager {
    constructor() {
        this.settings = this.load();
    }
    
    // Load settings from localStorage
    load() {
        try {
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new settings added in updates
                return this.mergeDeep(DEFAULT_GAME_SETTINGS, parsed);
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
        return { ...DEFAULT_GAME_SETTINGS };
    }
    
    // Save settings to localStorage
    save() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }
    
    // Deep merge helper
    mergeDeep(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeDeep(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }
    
    // Get a setting value
    get(path) {
        const keys = path.split('.');
        let value = this.settings;
        for (const key of keys) {
            value = value?.[key];
        }
        return value;
    }
    
    // Set a setting value
    set(path, value) {
        const keys = path.split('.');
        let obj = this.settings;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        this.save();
    }
    
    // Get all settings
    getAll() {
        return { ...this.settings };
    }
    
    // Get difficulty modifiers
    getDifficultyModifiers() {
        return DIFFICULTY_MODIFIERS[this.settings.gameplay.difficulty];
    }
    
    // Reset to defaults
    reset() {
        this.settings = { ...DEFAULT_GAME_SETTINGS };
        this.save();
    }
    
    // Export settings as JSON string
    export() {
        return JSON.stringify(this.settings, null, 2);
    }
    
    // Import settings from JSON string
    import(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            this.settings = this.mergeDeep(DEFAULT_GAME_SETTINGS, imported);
            this.save();
            return true;
        } catch (e) {
            console.error('Failed to import settings:', e);
            return false;
        }
    }
    
    // Apply settings to game
    applyToGame() {
        const mods = this.getDifficultyModifiers();
        
        return {
            // Audio
            masterVolume: this.settings.audio.masterVolume,
            musicVolume: this.settings.audio.musicVolume,
            sfxVolume: this.settings.audio.sfxVolume,
            muteAll: this.settings.audio.muteAll,
            
            // Graphics
            screenShake: this.settings.graphics.screenShake,
            shakeIntensity: this.settings.graphics.shakeIntensity * mods.ballSpeedMultiplier,
            particleDensity: this.settings.graphics.particleDensity,
            bloomEnabled: this.settings.graphics.bloomEnabled,
            
            // Gameplay
            difficulty: this.settings.gameplay.difficulty,
            ballSpeedMultiplier: mods.ballSpeedMultiplier * this.settings.gameplay.ballSpeed,
            paddleWidthBonus: mods.paddleWidthBonus,
            brickHPModifier: mods.brickHPModifier,
            powerUpChance: mods.powerUpChance * this.settings.gameplay.difficulty,
            lives: mods.lives,
            
            // Controls
            paddleSensitivity: this.settings.controls.mouseSensitivity * this.settings.gameplay.paddleSensitivity,
            
            // Accessibility
            textSize: this.settings.accessibility.textSize,
            highContrast: this.settings.accessibility.highContrast,
            reducedMotion: this.settings.accessibility.reducedMotion
        };
    }
}

// Singleton instance
let settingsInstance = null;

export function getGameSettings() {
    if (!settingsInstance) {
        settingsInstance = new GameSettingsManager();
    }
    return settingsInstance;
}

export function createSettingsUI() {
    const settings = getGameSettings();
    const current = settings.getAll();
    
    // Create settings modal HTML
    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.innerHTML = `
        <div class="settings-overlay"></div>
        <div class="settings-content">
            <div class="settings-header">
                <h2>⚙️ Settings</h2>
                <button class="settings-close">&times;</button>
            </div>
            
            <div class="settings-tabs">
                <button class="settings-tab active" data-tab="audio">🔊 Audio</button>
                <button class="settings-tab" data-tab="graphics">🎨 Graphics</button>
                <button class="settings-tab" data-tab="gameplay">🎮 Gameplay</button>
                <button class="settings-tab" data-tab="accessibility">♿ Accessibility</button>
            </div>
            
            <div class="settings-body">
                <!-- Audio Tab -->
                <div class="settings-panel active" data-panel="audio">
                    <div class="setting-group">
                        <label>Master Volume</label>
                        <input type="range" min="0" max="1" step="0.05" 
                               value="${current.audio.masterVolume}" data-setting="audio.masterVolume">
                        <span class="setting-value">${Math.round(current.audio.masterVolume * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label>Music Volume</label>
                        <input type="range" min="0" max="1" step="0.05" 
                               value="${current.audio.musicVolume}" data-setting="audio.musicVolume">
                        <span class="setting-value">${Math.round(current.audio.musicVolume * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label>SFX Volume</label>
                        <input type="range" min="0" max="1" step="0.05" 
                               value="${current.audio.sfxVolume}" data-setting="audio.sfxVolume">
                        <span class="setting-value">${Math.round(current.audio.sfxVolume * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label>Voice Volume</label>
                        <input type="range" min="0" max="1" step="0.05" 
                               value="${current.audio.voiceVolume}" data-setting="audio.voiceVolume">
                        <span class="setting-value">${Math.round(current.audio.voiceVolume * 100)}%</span>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" data-setting="audio.muteAll" 
                                   ${current.audio.muteAll ? 'checked' : ''}>
                            Mute All Audio
                        </label>
                    </div>
                </div>
                
                <!-- Graphics Tab -->
                <div class="settings-panel" data-panel="graphics">
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" data-setting="graphics.screenShake" 
                                   ${current.graphics.screenShake ? 'checked' : ''}>
                            Enable Screen Shake
                        </label>
                    </div>
                    <div class="setting-group">
                        <label>Shake Intensity</label>
                        <input type="range" min="0" max="2" step="0.1" 
                               value="${current.graphics.shakeIntensity}" data-setting="graphics.shakeIntensity">
                        <span class="setting-value">${Math.round(current.graphics.shakeIntensity * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label>Particle Density</label>
                        <input type="range" min="0.25" max="1" step="0.25" 
                               value="${current.graphics.particleDensity}" data-setting="graphics.particleDensity">
                        <span class="setting-value">${Math.round(current.graphics.particleDensity * 100)}%</span>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" data-setting="graphics.bloomEnabled" 
                                   ${current.graphics.bloomEnabled ? 'checked' : ''}>
                            Enable Bloom Effect
                        </label>
                    </div>
                </div>
                
                <!-- Gameplay Tab -->
                <div class="settings-panel" data-panel="gameplay">
                    <div class="setting-group">
                        <label>Difficulty</label>
                        <select data-setting="gameplay.difficulty">
                            <option value="easy" ${current.gameplay.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
                            <option value="normal" ${current.gameplay.difficulty === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="hard" ${current.gameplay.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
                            <option value="nightmare" ${current.gameplay.difficulty === 'nightmare' ? 'selected' : ''}>Nightmare</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>Ball Speed</label>
                        <input type="range" min="0.5" max="1.5" step="0.1" 
                               value="${current.gameplay.ballSpeed}" data-setting="gameplay.ballSpeed">
                        <span class="setting-value">${Math.round(current.gameplay.ballSpeed * 100)}%</span>
                    </div>
                    <div class="setting-group">
                        <label>Paddle Sensitivity</label>
                        <input type="range" min="0.5" max="2" step="0.1" 
                               value="${current.gameplay.paddleSensitivity}" data-setting="gameplay.paddleSensitivity">
                        <span class="setting-value">${Math.round(current.gameplay.paddleSensitivity * 100)}%</span>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" data-setting="gameplay.showTrails" 
                                   ${current.gameplay.showTrails ? 'checked' : ''}>
                            Show Ball Trails
                        </label>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" data-setting="gameplay.comboDisplay" 
                                   ${current.gameplay.comboDisplay ? 'checked' : ''}>
                            Show Combo Display
                        </label>
                    </div>
                </div>
                
                <!-- Accessibility Tab -->
                <div class="settings-panel" data-panel="accessibility">
                    <div class="setting-group">
                        <label>Text Size</label>
                        <select data-setting="accessibility.textSize">
                            <option value="small" ${current.accessibility.textSize === 'small' ? 'selected' : ''}>Small</option>
                            <option value="medium" ${current.accessibility.textSize === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="large" ${current.accessibility.textSize === 'large' ? 'selected' : ''}>Large</option>
                        </select>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" data-setting="accessibility.highContrast" 
                                   ${current.accessibility.highContrast ? 'checked' : ''}>
                            High Contrast Mode
                        </label>
                    </div>
                    <div class="setting-group checkbox">
                        <label>
                            <input type="checkbox" data-setting="accessibility.reducedMotion" 
                                   ${current.accessibility.reducedMotion ? 'checked' : ''}>
                            Reduced Motion
                        </label>
                    </div>
                    <div class="setting-group">
                        <label>Color Blind Mode</label>
                        <select data-setting="accessibility.colorBlindMode">
                            <option value="none" ${current.accessibility.colorBlindMode === 'none' ? 'selected' : ''}>None</option>
                            <option value="protanopia" ${current.accessibility.colorBlindMode === 'protanopia' ? 'selected' : ''}>Protanopia</option>
                            <option value="deuteranopia" ${current.accessibility.colorBlindMode === 'deuteranopia' ? 'selected' : ''}>Deuteranopia</option>
                            <option value="tritanopia" ${current.accessibility.colorBlindMode === 'tritanopia' ? 'selected' : ''}>Tritanopia</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="settings-footer">
                <button class="settings-reset">Reset to Defaults</button>
                <button class="settings-save primary">Save & Close</button>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .settings-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
        }
        .settings-content {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #0d0221;
            border: 2px solid #7c4dff;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            z-index: 1001;
            font-family: 'Poiret', sans-serif;
        }
        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #7c4dff;
        }
        .settings-header h2 {
            color: #00fff7;
            margin: 0;
            font-size: 24px;
        }
        .settings-close {
            background: none;
            border: none;
            color: #fff;
            font-size: 32px;
            cursor: pointer;
            line-height: 1;
        }
        .settings-tabs {
            display: flex;
            border-bottom: 1px solid #7c4dff;
        }
        .settings-tab {
            flex: 1;
            padding: 12px;
            background: none;
            border: none;
            color: rgba(255,255,255,0.6);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .settings-tab:hover {
            color: #fff;
            background: rgba(124, 77, 255, 0.2);
        }
        .settings-tab.active {
            color: #00fff7;
            background: rgba(124, 77, 255, 0.4);
            border-bottom: 2px solid #00fff7;
        }
        .settings-body {
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        .settings-panel {
            display: none;
        }
        .settings-panel.active {
            display: block;
        }
        .setting-group {
            margin-bottom: 20px;
        }
        .setting-group label {
            display: block;
            color: #fff;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .setting-group.checkbox label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }
        .setting-group input[type="range"] {
            width: 100%;
            margin-right: 10px;
        }
        .setting-group select {
            width: 100%;
            padding: 8px;
            background: #1a0a2e;
            border: 1px solid #7c4dff;
            color: #fff;
            border-radius: 4px;
        }
        .setting-value {
            color: #00fff7;
            font-size: 14px;
            min-width: 40px;
            display: inline-block;
        }
        .settings-footer {
            display: flex;
            justify-content: space-between;
            padding: 20px;
            border-top: 1px solid #7c4dff;
        }
        .settings-footer button {
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .settings-reset {
            background: transparent;
            border: 1px solid #ff6b9d;
            color: #ff6b9d;
        }
        .settings-reset:hover {
            background: #ff6b9d;
            color: #0d0221;
        }
        .settings-save {
            background: #7c4dff;
            border: none;
            color: #fff;
        }
        .settings-save:hover {
            background: #00fff7;
            color: #0d0221;
        }
        .settings-save.primary {
            background: #ffd700;
            color: #0d0221;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Tab switching
    modal.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            try {
                modal.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const panel = modal.querySelector(`[data-panel="${tab.dataset.tab}"]`);
                if (panel) panel.classList.add('active');
            } catch (error) {
                console.error('Tab click error:', error);
            }
        });
    });
    
    // Slider value updates
    modal.querySelectorAll('input[type="range"]').forEach(input => {
        input.addEventListener('input', () => {
            const valueSpan = input.parentElement.querySelector('.setting-value');
            if (valueSpan) {
                valueSpan.textContent = Math.round(input.value * 100) + '%';
            }
        });
    });
    
    // Close button
    modal.querySelector('.settings-close').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.querySelector('.settings-overlay').addEventListener('click', () => {
        modal.remove();
    });
    
    // Save button
    modal.querySelector('.settings-save').addEventListener('click', () => {
        modal.querySelectorAll('[data-setting]').forEach(element => {
            const path = element.dataset.setting;
            let value;
            if (element.type === 'checkbox') {
                value = element.checked;
            } else if (element.type === 'range' || element.tagName === 'SELECT') {
                value = element.value;
                if (!isNaN(parseFloat(value)) && isFinite(value)) {
                    value = parseFloat(value);
                }
            } else {
                value = element.value;
            }
            settings.set(path, value);
        });
        modal.remove();
        // Reload page to apply settings
        window.location.reload();
    });
    
    // Reset button
    modal.querySelector('.settings-reset').addEventListener('click', () => {
        if (confirm('Reset all settings to defaults?')) {
            settings.reset();
            window.location.reload();
        }
    });
    
    return modal;
}

// Export for use in game
export default {
    getGameSettings,
    createSettingsUI,
    DEFAULT_GAME_SETTINGS,
    DIFFICULTY_MODIFIERS
};
