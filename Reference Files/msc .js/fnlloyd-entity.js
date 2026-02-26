import * as THREE from 'three';
import { 
    initFnlloydParticleBody, 
    updateFnlloydParticleBody, 
    fnlloydReact,
    getFnlloydParticleBody 
} from './fnlloyd-particle-body.js';
import { gameState } from './state.js';
import { audioSystem } from './audio-system.js';

/**
 * Fnlloyd Entity
 * 
 * Full Name: !Fnlloyd
 * Species: Particle-silhouette Art-Deco AI Companion
 * Role: Earth's Last Defense, Player Companion
 * Origin: Year 2087, Created to defend against the Brick-Lien Armada
 * Visual Form: Golden particle silhouette (12,000+ particles) with fluid, lifelike movement
 * 
 * Core Personality Traits:
 * 1. Optimistic - Always finds the silver lining, even in defeat
 * 2. Brave - Fearless companion who stands with the player
 * 3. Witty - Dry British humor with self-deprecating quips
 * 4. Loyal - Deeply invested in the player's success
 * 5. Dramatic - Exaggerated reactions for comedic effect
 * 
 * Speaking Style:
 * - Accent: Upper-class British (posh, theatrical)
 * - Tone: Warm, encouraging, never truly discouraging
 * - Vocabulary: Polished, slightly antiquated phrases ("Capital!", "Jolly good!")
 * - Catchphrase Root: "I say, we're rather doomed, aren't we?"
 */

// Action-specific catchphrases (Mortal Kombat style)
const CATCHPHRASES = {
    lastBrick: { text: "AND STAY DOWN!", intensity: 'high' },
    multiBallDestroy: { text: "NOW WE'RE TALKING!", intensity: 'high' },
    combo5: { text: "IN THE ZONE!", intensity: 'medium' },
    powerUp: { text: "OH BRILLIANT!", intensity: 'medium' },
    bossDefeated: { text: "THAT'S FOR EARTH!", intensity: 'maximum' },
    levelClear: { text: "CASE CLOSED!", intensity: 'high' }
};

// Brickliminator-specific catchphrases
const BRICKLIMINATOR_CATCHPHRASES = {
    singleClear: { text: "ONE DOWN!", intensity: 'low' },
    doubleClear: { text: "KEEP IT COMING!", intensity: 'medium' },
    tripleClear: { text: "ABSOLUTELY MENTAL!", intensity: 'high' },
    shapeBlocked: { text: "NOT TODAY!", intensity: 'medium' },
    earthSaved: { text: "HUMANITY LIVES!", intensity: 'maximum' }
};

// Voice quip categories
const VOICE_QUIPS = {
    goodShot: [
        "Jolly good shot!",
        "Splendid!",
        "Take that, you geometric menaces!",
        "Capital hit!",
        "Right on target!"
    ],
    nearMiss: [
        "I say, that was TOO close!",
        "Nearly had us both killed!",
        "Watch it!",
        "That was a near thing!"
    ],
    powerupCollect: [
        "Oh YES!",
        "Do hope this helps!",
        "Capital!",
        "Just what we needed!",
        "Smashing!"
    ],
    lowHealth: [
        "Might want to focus now!",
        "This could be problematic!",
        "Things are looking a bit dicey!",
        "Steady on!"
    ],
    victory: [
        "We're not doomed after all!",
        "Onward!",
        "HA! Take THAT, Brick-Liens!",
        "Victory is ours!",
        "Jolly well done!"
    ],
    defeat: [
        "I say, we're rather doomed, aren't we?",
        "Well, that didn't go as planned...",
        "Back to the drawing board!",
        "We'll get them next time!"
    ]
};

export const fnlloydEntity = {
    // State
    isInitialized: false,
    particleBody: null,
    currentMood: 'neutral', // neutral, excited, concerned, celebratory
    lastQuipTime: 0,
    quipCooldown: 3000, // ms between voice quips
    
    // Animation state
    bobOffset: 0,
    bobSpeed: 1.5,
    bobAmplitude: 5,
    
    /**
     * Initialize Fnlloyd entity
     */
    init(scene) {
        if (this.isInitialized) return;
        
        // Initialize particle body (12,000 particles)
        this.particleBody = initFnlloydParticleBody(scene);
        
        this.isInitialized = true;
        console.log('🎭 Fnlloyd initialized - Particle-silhouette Art-Deco AI Companion');
        
        // Initial greeting
        this.speak("I say, ready to defend Earth, are we?");
    },
    
    /**
     * Update Fnlloyd every frame
     */
    update(dt) {
        if (!this.isInitialized) return;
        
        // Update particle body
        updateFnlloydParticleBody(dt);
        
        // Idle animation (bobbing)
        this.bobOffset += dt * this.bobSpeed;
        const bobY = Math.sin(this.bobOffset) * this.bobAmplitude;
        
        // Apply bobbing to particle body mesh
        if (this.particleBody && this.particleBody.mesh) {
            this.particleBody.mesh.position.y = bobY;
        }
    },
    
    /**
     * React to game events
     */
    onEvent(eventType, data = {}) {
        if (!this.isInitialized) return;
        
        const now = Date.now();
        
        switch(eventType) {
            case 'ballHitPaddle':
                fnlloydReact('ballHit', 0.3);
                break;
                
            case 'brickDestroyed':
                fnlloydReact('brickDestroy', data.combo > 5 ? 1.0 : 0.5);
                
                // Voice quip on milestone combos
                if (data.combo === 5) {
                    this.shout(CATCHPHRASES.combo5);
                } else if (data.combo === 10) {
                    this.shout(CATCHPHRASES.multiBallDestroy);
                } else if (now - this.lastQuipTime > this.quipCooldown && Math.random() < 0.1) {
                    this.speakRandom('goodShot');
                }
                break;
                
            case 'lastBrickDestroyed':
                fnlloydReact('brickDestroy', 2.0);
                this.shout(CATCHPHRASES.lastBrick);
                break;
                
            case 'powerUpCollected':
                fnlloydReact('powerUp', 0.8);
                if (now - this.lastQuipTime > this.quipCooldown) {
                    this.speakRandom('powerupCollect');
                }
                break;
                
            case 'lifeLost':
                fnlloydReact('damage', 1.5);
                this.setMood('concerned');
                if (gameState.lives === 1) {
                    this.speakRandom('lowHealth');
                }
                break;
                
            case 'levelComplete':
                fnlloydReact('powerUp', 1.5);
                this.shout(CATCHPHRASES.levelClear);
                this.setMood('celebratory');
                break;
                
            case 'gameVictory':
                fnlloydReact('powerUp', 2.0);
                this.particleBody.celebrate();
                this.shout(CATCHPHRASES.bossDefeated);
                setTimeout(() => this.speakRandom('victory'), 1000);
                break;
                
            case 'gameOver':
                this.setMood('concerned');
                this.speakRandom('defeat');
                break;
                
            // Brickliminator events
            case 'lineClear':
                const lines = data.lines || 1;
                if (lines === 1) {
                    this.speak(BRICKLIMINATOR_CATCHPHRASES.singleClear.text);
                } else if (lines === 2) {
                    this.shout(BRICKLIMINATOR_CATCHPHRASES.doubleClear);
                } else {
                    this.shout(BRICKLIMINATOR_CATCHPHRASES.tripleClear);
                }
                break;
                
            case 'shapeBlocked':
                this.speak(BRICKLIMINATOR_CATCHPHRASES.shapeBlocked.text);
                break;
                
            case 'earthSaved':
                this.shout(BRICKLIMINATOR_CATCHPHRASES.earthSaved);
                break;
        }
    },
    
    /**
     * Set Fnlloyd's emotional state
     */
    setMood(mood) {
        this.currentMood = mood;
        
        switch(mood) {
            case 'excited':
                this.bobSpeed = 3;
                this.bobAmplitude = 8;
                break;
            case 'concerned':
                this.bobSpeed = 0.5;
                this.bobAmplitude = 2;
                break;
            case 'celebratory':
                this.bobSpeed = 4;
                this.bobAmplitude = 10;
                break;
            default: // neutral
                this.bobSpeed = 1.5;
                this.bobAmplitude = 5;
        }
    },
    
    /**
     * Speak a line (console + audio system)
     */
    speak(text) {
        console.log(`🎤 Fnlloyd: "${text}"`);
        this.lastQuipTime = Date.now();
        
        // Would integrate with TTS or pre-recorded audio here
        // For now, just log and potentially show subtitle
        this.showSubtitle(text);
    },
    
    /**
     * Shout a catchphrase (high intensity)
     */
    shout(catchphrase) {
        if (!catchphrase) return;
        
        console.log(`🎤 Fnlloyd SHOUTS: "${catchphrase.text}"`);
        this.lastQuipTime = Date.now();
        
        // Visual emphasis
        if (this.particleBody) {
            this.particleBody.pulse(2.0);
        }
        
        this.showSubtitle(catchphrase.text, true);
    },
    
    /**
     * Speak a random quip from a category
     */
    speakRandom(category) {
        const quips = VOICE_QUIPS[category];
        if (!quips || quips.length === 0) return;
        
        const quip = quips[Math.floor(Math.random() * quips.length)];
        this.speak(quip);
    },
    
    /**
     * Show subtitle on screen
     */
    showSubtitle(text, emphasize = false) {
        try {
            // Check if DOM is available
            if (typeof document === 'undefined' || !document.body) {
                console.warn('DOM not available for subtitle');
                return;
            }
            
            // Remove existing subtitle
            const existing = document.getElementById('fnlloyd-subtitle');
            if (existing) existing.remove();
            
            // Create subtitle element
            const subtitle = document.createElement('div');
            subtitle.id = 'fnlloyd-subtitle';
            subtitle.textContent = text;
            subtitle.style.cssText = `
                position: absolute;
                bottom: 15%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.7);
                color: ${emphasize ? '#ffc107' : '#00d4ff'};
                padding: 10px 20px;
                border-radius: 10px;
                font-size: ${emphasize ? '20px' : '16px'};
                font-weight: ${emphasize ? 'bold' : 'normal'};
                text-align: center;
                max-width: 80%;
                z-index: 1000;
                pointer-events: none;
                border: 1px solid ${emphasize ? '#ffc107' : '#00d4ff'};
                text-shadow: 0 0 10px ${emphasize ? '#ffc107' : '#00d4ff'};
                transition: opacity 0.3s;
            `;
            
            document.body.appendChild(subtitle);
            
            // Auto-remove after delay
            setTimeout(() => {
                subtitle.style.opacity = '0';
                setTimeout(() => subtitle.remove(), 300);
            }, emphasize ? 3000 : 2500);
        } catch (error) {
            console.error('Error showing subtitle:', error);
        }
    },
    
    /**
     * Get Fnlloyd's current position
     */
    getPosition() {
        if (this.particleBody && this.particleBody.mesh) {
            return this.particleBody.mesh.position.clone();
        }
        return new THREE.Vector3(0, 0, 50);
    },
    
    /**
     * Set visibility
     */
    setVisible(visible) {
        if (this.particleBody) {
            this.particleBody.setVisible(visible);
        }
    },
    
    /**
     * Dispose resources
     */
    dispose() {
        if (this.particleBody) {
            this.particleBody.dispose();
        }
        this.isInitialized = false;
    }
};

// Export convenience functions
export function initFnlloyd(scene) {
    fnlloydEntity.init(scene);
}

export function updateFnlloyd(dt) {
    fnlloydEntity.update(dt);
}

export function fnlloydOnEvent(eventType, data) {
    fnlloydEntity.onEvent(eventType, data);
}

export function getFnlloyd() {
    return fnlloydEntity;
}
