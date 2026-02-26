/**
 * !Fnlloyd Reference - Engine (State Machine)
 * Source: SF_!Fnlloyd.html.txt lines 166-211
 * 
 * This is a direct extraction of the working state machine from the reference.
 * No modifications - preserving exact behavior for Phase 1.
 */

// --- CORE GAME STATE ---
const Engine = {
    state: 'START', // START, ARKANOID, TRANSITION, BRICKLIMINATOR, GAMEOVER
    score: 0, lives: 3, earthHealth: 100,
    cameraScale: 1.0, cameraY: 0,

    updateHUD: function() {
        const scoreDisplay = document.getElementById('scoreDisplay');
        const livesDisplay = document.getElementById('livesDisplay');
        const earthHealthDisplay = document.getElementById('earthHealthDisplay');
        
        if(scoreDisplay) scoreDisplay.innerText = `SCORE: ${this.score}`;
        if(livesDisplay) livesDisplay.innerText = `LIVES: ${this.lives}`;
        
        if(earthHealthDisplay) {
            earthHealthDisplay.innerText = `EARTH: ${this.earthHealth}%`;
            if(this.earthHealth <= 50) {
                earthHealthDisplay.classList.add('danger');
            } else {
                earthHealthDisplay.classList.remove('danger');
            }
        }
    },

    triggerTransition: function() {
        if(this.state !== 'ARKANOID') return;
        this.state = 'TRANSITION';
        Audio.alarm();
        
        const phaseAlert = document.getElementById('phaseAlert');
        if(phaseAlert) phaseAlert.style.opacity = 1;
        
        // Clear balls
        if (typeof Arkanoid !== 'undefined') {
            Arkanoid.balls = [];
        }
        
        // Transition Animation
        let f = 0;
        const anim = setInterval(() => {
            f += 0.02;
            this.cameraScale = 1.0 - (f * 0.4); // Zoom out to 60%
            this.cameraY = f * 150; // Pan down
            if(f >= 1.0) {
                clearInterval(anim);
                setTimeout(() => {
                    const phaseAlert = document.getElementById('phaseAlert');
                    if(phaseAlert) phaseAlert.style.opacity = 0;
                    this.state = 'BRICKLIMINATOR';
                    if (typeof Brickliminator !== 'undefined') {
                        Brickliminator.init();
                    }
                }, 1000);
            }
        }, 16);
    },

    damageEarth: function(amt) {
        this.earthHealth = Math.max(0, this.earthHealth - amt);
        this.updateHUD();
        Audio.explosion();
        if(this.earthHealth <= 0) {
            this.state = 'GAMEOVER';
            const gameOverScreen = document.getElementById('gameOverScreen');
            if(gameOverScreen) gameOverScreen.classList.remove('hidden');
        }
    }
};

export default Engine;