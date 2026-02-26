/**
 * !Fnlloyd Settings Manager
 * 
 * Manages LLM settings for !Fnlloyd's conversational abilities
 * Integrates with: fnlloyd-chat.js, fnlloyd-api.js, shared-memory.json
 * 
 * TARGET FILES TO MODIFY FOR INTEGRATION:
 * - index.html (main page) - Add Settings menu link
 * - index-master.html - Add Settings menu link  
 * - Any game client that needs LLM-powered dialogue
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default settings
const DEFAULT_SETTINGS = {
    version: '1.0',
    model: {
        name: 'qwen3:14b',
        apiEndpoint: 'http://localhost:3456',
        temperature: 0.7,
        maxTokens: 150
    },
    personality: {
        intensity: 0.7,
        responseType: 'hybrid', // 'quick' | 'llm' | 'hybrid'
        contextLevel: 'both'     // 'gameplay' | 'development' | 'both'
    },
    triggers: {
        goodShot: true,
        nearMiss: true,
        powerup: true,
        levelComplete: true,
        boss: true,
        lifeLost: true,
        lineClear: true,
        combo: true,
        idle: true
    },
    memory: {
        enabled: true,
        sessionId: 'default',
        maxHistory: 20
    }
};

// Settings file path
const SETTINGS_FILE = join(__dirname, 'fnlloyd-settings.json');

class FnlloydSettings {
    constructor() {
        this.settings = this.load();
    }

    // Load settings from file
    load() {
        if (existsSync(SETTINGS_FILE)) {
            try {
                const data = readFileSync(SETTINGS_FILE, 'utf-8');
                return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
            } catch (e) {
                console.warn('Failed to load settings:', e);
            }
        }
        return { ...DEFAULT_SETTINGS };
    }

    // Save settings to file
    save() {
        writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
    }

    // Get current settings
    get() {
        return this.settings;
    }

    // Update specific setting
    set(key, value) {
        const keys = key.split('.');
        let obj = this.settings;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        this.save();
    }

    // Get model name
    getModel() {
        return this.settings.model.name;
    }

    // Get API endpoint
    getApiEndpoint() {
        return this.settings.model.apiEndpoint;
    }

    // Get response type
    getResponseType() {
        return this.settings.personality.responseType;
    }

    // Check if trigger is enabled
    isTriggerEnabled(trigger) {
        return this.settings.triggers[trigger] !== false;
    }

    // Get context level
    getContextLevel() {
        return this.settings.personality.contextLevel;
    }

    // Get session ID
    getSessionId() {
        return this.settings.memory.sessionId;
    }

    // Reset to defaults
    reset() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.save();
    }

    // Export for web/localStorage
    exportForWeb() {
        return {
            model: this.settings.model.name,
            apiEndpoint: this.settings.model.apiEndpoint,
            personality: this.settings.personality,
            response: {
                maxTokens: this.settings.model.maxTokens,
                temperature: this.settings.model.temperature,
                triggers: this.settings.triggers
            },
            memory: this.settings.memory
        };
    }

    // Import from web/localStorage
    importFromWeb(webSettings) {
        if (webSettings.model) {
            this.settings.model.name = webSettings.model;
            this.settings.model.apiEndpoint = webSettings.apiEndpoint;
        }
        if (webSettings.personality) {
            this.settings.personality = { ...this.settings.personality, ...webSettings.personality };
        }
        if (webSettings.response?.triggers) {
            this.settings.triggers = { ...this.settings.triggers, ...webSettings.response.triggers };
        }
        if (webSettings.memory) {
            this.settings.memory = { ...this.settings.memory, ...webSettings.memory };
        }
        this.save();
    }
}

// CLI interface
const args = process.argv.slice(2);
if (args.length > 0) {
    const settings = new FnlloydSettings();
    const command = args[0];

    switch (command) {
        case 'get':
            if (args[1]) {
                console.log(JSON.stringify(settings.get()[args[1]], null, 2));
            } else {
                console.log(JSON.stringify(settings.get(), null, 2));
            }
            break;
            
        case 'set':
            if (args[1] && args[2]) {
                settings.set(args[1], args[2]);
                console.log(`Set ${args[1]} = ${args[2]}`);
            }
            break;
            
        case 'reset':
            settings.reset();
            console.log('Settings reset to defaults');
            break;
            
        case 'export':
            console.log(JSON.stringify(settings.exportForWeb(), null, 2));
            break;
            
        case 'import':
            try {
                const data = JSON.parse(args.slice(1).join(' '));
                settings.importFromWeb(data);
                console.log('Settings imported');
            } catch (e) {
                console.error('Invalid JSON:', e.message);
            }
            break;
            
        default:
            console.log('Usage:');
            console.log('  node settings-manager.js get [key]     - Get setting(s)');
            console.log('  node settings-manager.js set <key> <val> - Set a value');
            console.log('  node settings-manager.js reset        - Reset to defaults');
            console.log('  node settings-manager.js export       - Export for web');
            console.log('  node settings-manager.js import <json> - Import from JSON');
    }
}

export default FnlloydSettings;
export { FnlloydSettings, DEFAULT_SETTINGS };
