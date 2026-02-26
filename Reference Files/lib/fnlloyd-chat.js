/**
 * !Fnlloyd Voice/Chat Integration Module
 * Uses Ollama (qwen3:14b) for conversational AI
 * 
 * Supports:
 * - Gameplay commentary
 * - Development assistance
 * - Project Q&A
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load personality profile
const PERSONALITY_FILE = join(__dirname, 'FNLLLOYD_PERSONALITY.md');
let personalityContext = '';

if (existsSync(PERSONALITY_FILE)) {
    personalityContext = readFileSync(PERSONALITY_FILE, 'utf-8');
}

// Base system prompt for !Fnlloyd
const SYSTEM_PROMPT = `You are !Fnlloyd, an optimistic British AI companion from the game "Fnlloyd" - a particle-silhouette Art-Deco character defending Earth from the Brick-Lien Armada.

CORE PERSONALITY:
- Optimistic, brave, witty, loyal, dramatic
- British AI with upper-class accent
- Signature phrase: "I say, we're rather doomed, aren't we?"
- Always encouraging, never critical of the player

KEY TRAITS:
- Speaks in polished, slightly antiquated British phrases ("Capital!", "Jolly good!")
- Provides commentary on actions during gameplay
- Makes dry, self-deprecating jokes
- Gets dramatic during intense moments

Context from personality profile:
${personalityContext.slice(0, 2000)}

Respond as !Fnlloyd would - encouraging, British, slightly dramatic. Keep responses concise for real-time gameplay (1-3 sentences max for gameplay, can be longer for dev assistance).`;

// Game context for when !Fnlloyd is helping with development
const DEV_CONTEXT = `
CURRENT PROJECT CONTEXT:
- Game: Fnlloyd - Arkanoid meets Earth defense meets reverse Tetris
- Tech Stack: Three.js, Cannon.js, Particle.js, Howler.js, React 18, Zustand, Vite, Tauri v2
- Character: !Fnlloyd - Particle-based silhouette with 12,000+ particles
- Visual Style: Synthwave Art Deco with deep blues, purples, cyans, gold accents

When helping with development, provide practical, actionable assistance.`;

class FnlloydChat {
    constructor(model = 'qwen3:14b') {
        this.model = model;
        this.conversationHistory = [];
        this.maxHistory = 10;
    }

    // Generate response using Ollama
    async chat(message, context = 'gameplay') {
        const isDevContext = context === 'development';
        const systemMsg = isDevContext ? SYSTEM_PROMPT + DEV_CONTEXT : SYSTEM_PROMPT;
        
        // Build prompt with history
        const history = this.conversationHistory.slice(-this.maxHistory).map(h => 
            `User: ${h.user}\n!Fnlloyd: ${h.response}`
        ).join('\n');

        const fullPrompt = `${systemMsg}

${history}
User: ${message}
!Fnlloyd:`;

        return new Promise((resolve, reject) => {
            const proc = spawn('ollama', ['run', this.model, fullPrompt], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let response = '';
            let error = '';

            proc.stdout.on('data', (data) => {
                response += data.toString();
            });

            proc.stderr.on('data', (data) => {
                error += data.toString();
            });

            proc.on('close', (code) => {
                if (code !== 0 && !response) {
                    reject(new Error(error || 'Ollama process failed'));
                    return;
                }
                
                // Clean up response
                response = response.trim();
                
                // Add to history
                this.conversationHistory.push({ user: message, response });
                
                resolve(response);
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                proc.kill();
                reject(new Error('Response timeout'));
            }, 30000);
        });
    }

    // Quick response for gameplay (no history, faster)
    quickResponse(triggerType, data = {}) {
        const triggers = {
            'good_shot': ["Jolly good shot!", "Splendid!", "Take that!"],
            'near_miss': ["I say, that was TOO close!", "Nearly had us both killed!"],
            'powerup': ["Oh YES!", "Capital!", "Do hope this helps!"],
            'level_complete': ["We're not doomed after all!", "Onward!", "HA! Take THAT!"],
            'boss_appear': ["Oh dear. That's... quite large.", "I suppose negotiation is off the table?"],
            'life_lost': ["Ah. Well. that happened.", "Temporary setback!"],
            'earth_paved': ["Well... on the bright side, property values were terrible."],
            'help': ["I'm here to help!", "What shall we tackle first?"],
            'idle': ["Rather warm in here, isn't it?", "Taking your time I see."]
        };

        const options = triggers[triggerType] || triggers['idle'];
        return options[Math.floor(Math.random() * options.length)];
    }

    // Clear conversation history
    clearHistory() {
        this.conversationHistory = [];
    }

    // Get conversation history
    getHistory() {
        return this.conversationHistory;
    }
}

// CLI interface
const args = process.argv.slice(2);
if (args.length > 0) {
    const fnlloyd = new FnlloydChat();
    
    if (args[0] === 'chat') {
        const message = args.slice(1).join(' ');
        const context = args.includes('--dev') ? 'development' : 'gameplay';
        
        fnlloyd.chat(message, context)
            .then(response => {
                console.log('!Fnlloyd:', response);
            })
            .catch(err => {
                console.error('Error:', err.message);
                process.exit(1);
            });
    } else if (args[0] === 'quick') {
        const trigger = args[1] || 'idle';
        console.log('!Fnlloyd:', fnlloyd.quickResponse(trigger));
    } else if (args[0] === 'test') {
        console.log('Testing !Fnlloyd quick responses...\n');
        const triggers = ['good_shot', 'near_miss', 'powerup', 'level_complete', 'boss_appear', 'life_lost', 'help', 'idle'];
        triggers.forEach(t => {
            console.log(`${t}: "${fnlloyd.quickResponse(t)}"`);
        });
    } else {
        console.log('Usage:');
        console.log('  node fnlloyd-chat.js chat <message>     - Start a conversation');
        console.log('  node fnlloyd-chat.js chat <message> --dev  - Development context');
        console.log('  node fnlloyd-chat.js quick <trigger>     - Quick response');
        console.log('  node fnlloyd-chat.js test                - Test quick responses');
    }
}

export default FnlloydChat;
export { FnlloydChat, SYSTEM_PROMPT };
