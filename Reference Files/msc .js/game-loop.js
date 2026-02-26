// ============================================
// GAME LOOP & ORCHESTRATION
// ============================================
import * as THREE from 'three';
import { CONSTANTS, BallType, BALL_CONFIGS, PowerUpType } from './constants.js';
import { gameState } from './state.js';
import { particleSystem, spawnParticles } from './particle-system.js';
export { spawnParticles };
import { updateComboDisplay, updateComboMultiplier, showScorePopup } from './score-system.js';
import { paddle, ballManager, bricks } from './entity-systems.js';
import { powerUpSystem } from './powerup-manager.js';
import { fireLaser, hitBrickWithLaser } from './laser-cannon.js';
import { startFlamethrower, stopFlamethrower, updateFlamethrower, damageBricksInCone } from './flamethrower.js';
import { fireIceBeam, updateFrozenBricks, cleanupFrozenBricks, freezeBrick } from './ice-beam.js';
import { launchHomingMissile, updateHomingMissiles, cleanupMissiles, explodeMissile } from './homing-missiles.js';
import { summonTheBanker, updateTheBanker, cleanupBanker, destroyBricksInRadius } from './banker-bomb.js';
import { playSound } from './audio-placeholder.js';
import { checkCollision as checkBrickCollision } from './collision-system.js';
import { paddleMorphSystem } from './paddle-morphs.js';
import { audioSystem } from './audio-system.js';
import { ballAbilities } from './ball-abilities-enhanced.js';
import { initFnlloyd, updateFnlloyd, fnlloydOnEvent } from './fnlloyd-entity.js';
import { errorTracker } from './error-tracker.js';

/**
 * Screen shake effect
 */
export function triggerScreenShake() {
    gameState.screenShake.intensity = CONSTANTS.SCREEN_SHAKE_INTENSITY;
    gameState.screenShake.duration = CONSTANTS.SCREEN_SHAKE_DURATION;
}

export function updateScreenShake(dt) {
    if (gameState.screenShake.duration > 0) {
        gameState.screenShake.duration -= dt * 1000;
        const shake = gameState.screenShake.intensity * (gameState.screenShake.duration / CONSTANTS.SCREEN_SHAKE_DURATION);
        gameState.screenShake.x = (Math.random() - 0.5) * shake;
        gameState.screenShake.y = (Math.random() - 0.5) * shake;
    } else {
        gameState.screenShake.x = 0;
        gameState.screenShake.y = 0;
    }
    
    if (gameState.camera) {
        gameState.camera.position.x = gameState.screenShake.x;
        gameState.camera.position.y = gameState.screenShake.y;
    }
}

/**
 * Complete game state reset - clears ALL game state between levels/lives
 */
export function resetGameState(scene) {
    // Reset core game state
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    gameState.combo = 0;
    gameState.ballLaunched = false;
    gameState.state = 'start';
    
    // Clear ALL entities
    ballManager.clear(scene);
    bricks.clear();
    powerUpSystem.clear(scene);
    
    // Clear particles - use particleSystem.clear() if available
    if (particleSystem && typeof particleSystem.clear === 'function') {
        particleSystem.clear();
    }
    
    // Reset paddle - deactivate all modifiers
    paddle.reset();
    if (paddle.deactivateSticky) paddle.deactivateSticky();
    if (paddle.removeMagneticField) paddle.removeMagneticField();
    if (paddle.removeShield) paddle.removeShield();
    
    // Clear weapons
    stopFlamethrower(scene);
    cleanupFrozenBricks();
    cleanupMissiles(scene);
    cleanupBanker(scene);
    
    updateHUD();
}

/**
 * Score system
 */
export function addScore(points, x, y, camera) {
    const comboMultiplier = Math.min(gameState.combo, 10);
    const totalPoints = points * comboMultiplier;
    gameState.score += totalPoints;
    
    // Update HUD
    document.getElementById('score').textContent = gameState.score;
    
    // Show combo
    updateComboDisplay();
    
    // Update combo multiplier
    updateComboMultiplier(comboMultiplier);
    
    // Score popup
    showScorePopup(totalPoints, x, y);
}

/**
 * Helper functions for ball abilities
 */
export function triggerAutoWin(scene) {
    // Destroy all bricks instantly
    bricks.items.forEach(brick => {
        if (!brick.isIndestructible && brick.hp > 0) {
            brick.hp = 0;
            brick.mesh.visible = false;
            spawnParticles(brick.x, brick.y, 0xffd700, 10);
        }
    });
    gameState.bricksRemaining = 0;
    addScore(10000, 0, 0);
    levelComplete();
}

/**
 * Time Warp visual effects
 */
let timeWarpMesh = null;

export function createTimeWarpEffect(scene) {
    if (timeWarpMesh) return;
    
    // Purple/pink distortion field covering entire play area
    const geo = new THREE.SphereGeometry(CONSTANTS.GAME_WIDTH / 2 + 50, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x9933ff,
        transparent: true,
        opacity: 0.15,
        wireframe: true
    });
    timeWarpMesh = new THREE.Mesh(geo, mat);
    timeWarpMesh.position.set(0, 0, -10);
    scene.add(timeWarpMesh);
    
    // Subtle purple particles throughout screen
    setInterval(() => {
        if (powerUpSystem.activePowerUps.some(p => p.type === PowerUpType.TIME_WARP)) {
            const x = (Math.random() - 0.5) * CONSTANTS.GAME_WIDTH;
            const y = (Math.random() - 0.5) * CONSTANTS.GAME_HEIGHT;
            spawnParticles(x, y, 0x9933ff, 1);
        }
    }, 100);
}

export function removeTimeWarpEffect(scene) {
    if (timeWarpMesh) {
        scene.remove(timeWarpMesh);
        timeWarpMesh.geometry.dispose();
        timeWarpMesh.material.dispose();
        timeWarpMesh = null;
    }
}

/**
 * Life management
 */
export function checkLifeLost(scene) {
    const lostBalls = gameState.activeBalls.filter(b => b.isLost);
    
    lostBalls.forEach(ball => {
        if (ball.mesh) {
            scene.remove(ball.mesh);
            ball.mesh.geometry.dispose();
            ball.mesh.material.dispose();
        }
        // FIX: remove from BOTH arrays by splicing in-place — never reassign either array reference
        // so the collision forEach (which reads ballManager.balls) always sees the live list
        const idxActive = gameState.activeBalls.indexOf(ball);
        if (idxActive > -1) gameState.activeBalls.splice(idxActive, 1);
        const idxBalls = ballManager.balls.indexOf(ball);
        if (idxBalls > -1) ballManager.balls.splice(idxBalls, 1);
    });
    
    if (gameState.activeBalls.length === 0) {
        loseLife(scene);
    }
}

export function loseLife(scene) {
    try {
        console.log('LOSE LIFE CALLED - Lives before:', gameState.lives);
        gameState.lives--;
        gameState.combo = 0;
        
        // Notify Fnlloyd of life lost
        fnlloydOnEvent('lifeLost');
        
        playSound('die');
        spawnParticles(0, -CONSTANTS.GAME_HEIGHT / 2, 0xff1744, 50);
        
        // Screen shake
        triggerScreenShake();
        
        // Red flash overlay
        const deathOverlay = document.createElement('div');
        deathOverlay.style.position = 'absolute';
        deathOverlay.style.top = '0';
        deathOverlay.style.left = '0';
        deathOverlay.style.width = '100%';
        deathOverlay.style.height = '100%';
        deathOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        deathOverlay.style.pointerEvents = 'none';
        document.body.appendChild(deathOverlay);
        
        setTimeout(() => {
            try {
                document.body.removeChild(deathOverlay);
            } catch (error) {
                console.error('Error removing death overlay:', error);
            }
        }, 200);
        
        // Clear all power-ups on life lost
        powerUpSystem.clear();
        
        // Cleanup all active weapons
        stopFlamethrower(scene);
        cleanupFrozenBricks();
        cleanupMissiles(scene);
        cleanupBanker(scene);
        
        // Release caught ball if Sticky Paddle was active
        if (paddle.caughtBall) {
            const ball = paddle.caughtBall;
            
            // Remove glow if exists
            if (ball.attachGlow) {
                try {
                    ball.mesh.remove(ball.attachGlow);
                    ball.attachGlow.geometry.dispose();
                    ball.attachGlow.material.dispose();
                    ball.attachGlow = null;
                } catch (error) {
                    console.error('Error disposing ball glow:', error);
                }
            }
            
            // Reset ball state
            ball.isCaught = false;
            ball.vx = 0;
            ball.vy = 0;
            paddle.caughtBall = null;
        }
        
        // Cleanup Banker
        cleanupBanker(scene);
        
        if (gameState.lives <= 0) {
            gameOver(scene);
        } else {
            console.log('RESETTING BALL - Lives remaining:', gameState.lives);
            // Reset all balls - pass paddle so ball spawns on top of it
            ballManager.clear(scene);
            paddle.reset();
            ballManager.setType(gameState.currentBallType, scene, paddle);
            gameState.ballLaunched = false;
            
            // Ready particles on ball reset
            spawnParticles(paddle.x, paddle.y + 30, 0x00fff7, 15);
            
            console.log('BALL RESET COMPLETE - New ball created, ballLaunched = false');
        }
        
        updateHUD();
    } catch (error) {
        console.error('❌ Error in loseLife:', error);
        console.error('Stack trace:', error.stack);
    }
}

/**
 * Level data (3 levels with progressive difficulty) - defined before levelComplete to avoid TDZ
 */
const LEVELS = [
    // Level 1: Simple rows
    {
        rows: 4, cols: 10,
        data: [
            1,1,1,1,1,1,1,1,1,1,
            1,1,1,1,1,1,1,1,1,1,
            1,1,1,1,1,1,1,1,1,1,
            3,3,3,3,3,3,3,3,3,3,
        ],
        colors: [0x00fff7, 0xff6b9d, 0xffd700],
        hp: 1,
        ballSpeed: 400
    },
    // Level 2: Multi-hit bricks introduced
    {
        rows: 5, cols: 10,
        data: [
            1,1,2,2,1,1,2,2,1,1,
            1,2,2,2,2,2,2,2,2,1,
            2,2,2,2,2,2,2,2,2,2,
            3,3,3,3,3,3,3,3,3,3,
            1,1,1,1,1,1,1,1,1,1,
        ],
        colors: [0x00fff7, 0xff6b9d, 0xffd700],
        hp: 1,
        ballSpeed: 450
    },
    // Level 3: Complex pattern with indestructibles
    {
        rows: 6, cols: 12,
        data: [
            1,1,1,3,3,3,3,3,3,1,1,1,
            1,1,2,2,2,2,2,2,2,2,1,1,
            1,2,2,2,2,2,2,2,2,2,2,1,
            2,2,2,2,2,2,2,2,2,2,2,2,
            3,3,3,3,3,3,3,3,3,3,3,3,
            1,1,1,1,1,1,1,1,1,1,1,1,
        ],
        colors: [0x00fff7, 0xff6b9d, 0xffd700],
        hp: 1,
        ballSpeed: 500
    }
];

/**
 * Level progression with error handling
 */
export function levelComplete() {
    try {
        // Check for paddle morph unlocks
        paddleMorphSystem.checkLevelUnlocks(gameState.level);
        
        // Notify Fnlloyd of level completion
        fnlloydOnEvent('levelComplete');
        
        // Play voice quip
        audioSystem.playVoice('victory');
        
        if (gameState.level >= LEVELS.length) {
            victory();
        } else {
            setTimeout(() => {
                try {
                    loadLevel(gameState.level + 1);
                } catch (error) {
                    console.error('Error loading next level:', error);
                }
            }, 1000);
        }
    } catch (error) {
        console.error('❌ Error in levelComplete:', error);
    }
}

export function gameOver(scene) {
    try {
        // Notify Fnlloyd of game over
        fnlloydOnEvent('gameOver');
        
        // Complete game reset for clean restart
        resetGameState(scene);
        
        gameState.state = 'dead';
        const finalScoreEl = document.getElementById('final-score');
        if (finalScoreEl) {
            finalScoreEl.textContent = gameState.score;
        }
        const gameOverScreen = document.getElementById('gameover-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('hidden');
        }
    } catch (error) {
        console.error('❌ Error in gameOver:', error);
    }
}

export function victory() {
    try {
        // Notify Fnlloyd of game victory
        fnlloydOnEvent('gameVictory');
        
        gameState.state = 'victory';
        const victoryScoreEl = document.getElementById('victory-score');
        if (victoryScoreEl) {
            victoryScoreEl.textContent = gameState.score;
        }
        const victoryScreen = document.getElementById('victory-screen');
        if (victoryScreen) {
            victoryScreen.classList.remove('hidden');
        }
    } catch (error) {
        console.error('❌ Error in victory:', error);
    }
}

export function updateHUD() {
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const levelEl = document.getElementById('level');
    const comboEl = document.getElementById('combo');
    
    if (scoreEl) scoreEl.textContent = gameState.score;
    if (livesEl) livesEl.textContent = gameState.lives;
    if (levelEl) levelEl.textContent = gameState.level;
    if (comboEl) comboEl.textContent = `x${Math.min(gameState.combo, 10)}`;
}

export function hideAllScreens() {
    document.querySelectorAll('#start-screen, #pause-screen, #gameover-screen, #victory-screen, #level-screen').forEach(el => {
        el.classList.add('hidden');
    });
}

export function startGame(scene) {
    try {
        console.log('START GAME CLICKED');
        
        // Use resetGameState for complete cleanup
        resetGameState(scene);
        
        updateHUD();
        loadLevel(1, scene);
        
        gameState.state = 'playing';
        hideAllScreens();
        console.log('Game state:', gameState.state, 'Bricks created:', bricks.items.length);
    } catch (error) {
        console.error('❌ Error starting game:', error);
        console.error('Stack trace:', error.stack);
    }
}

export function loadLevel(levelNum, scene) {
    try {
        gameState.level = levelNum;
        const levelData = LEVELS[levelNum - 1];
        
        if (!levelData) {
            console.error(`Level ${levelNum} not found in LEVELS array`);
            return;
        }
        
        // Set transition state
        gameState.state = 'level-transition';
        
        // Fade out effect
        const fadeOut = document.createElement('div');
        fadeOut.style.position = 'absolute';
        fadeOut.style.top = '0';
        fadeOut.style.left = '0';
        fadeOut.style.width = '100%';
        fadeOut.style.height = '100%';
        fadeOut.style.backgroundColor = '#000';
        fadeOut.style.transition = 'opacity 0.5s';
        fadeOut.style.opacity = '0';
        fadeOut.style.pointerEvents = 'none';
        document.body.appendChild(fadeOut);
        
        setTimeout(() => {
            fadeOut.style.opacity = '1';
            
            setTimeout(() => {
                try {
                    // Load level data while faded out
                    gameState.ballSpeed = levelData.ballSpeed || CONSTANTS.BALL_SPEED_BASE;
                    bricks.loadLevel(levelData, scene);
                    paddle.reset();
                    ballManager.setType(gameState.currentBallType, scene, paddle);
                    gameState.ballLaunched = false;
                    
                    // Show level number
                    const levelNumEl = document.getElementById('level-num');
                    if (levelNumEl) {
                        levelNumEl.textContent = levelNum;
                    }
                    const levelScreen = document.getElementById('level-screen');
                    if (levelScreen) {
                        levelScreen.classList.remove('hidden');
                    }
                    
                    playSound('level_start');
                    
                    setTimeout(() => {
                        const levelScreen = document.getElementById('level-screen');
                        if (levelScreen) {
                            levelScreen.classList.add('hidden');
                        }
                        
                        // Fade in
                        setTimeout(() => {
                            fadeOut.style.opacity = '0';
                            setTimeout(() => {
                                try {
                                    document.body.removeChild(fadeOut);
                                    gameState.state = 'playing';
                                    updateHUD();
                                } catch (error) {
                                    console.error('Error during level fade-in:', error);
                                }
                            }, 500);
                        }, 1500);
                    }, 1000);
                } catch (error) {
                    console.error(`Error loading level ${levelNum}:`, error);
                }
            }, 500);
        }, 100);
    } catch (error) {
        console.error(`❌ Critical error in loadLevel(${levelNum}):`, error);
    }
}

/**
 * Input handling (CORE-01)
 */
let mouseX = 0;

export function setupInput(canvas, renderer, scene, camera) {
    // Mouse move
    canvas.addEventListener('mousemove', (e) => {
        try {
            const rect = canvas.getBoundingClientRect();
            if (rect && rect.width > 0) {
                const scaleX = CONSTANTS.GAME_WIDTH / rect.width;
                mouseX = (e.clientX - rect.left) * scaleX - CONSTANTS.GAME_WIDTH / 2;
            }
        } catch (error) {
            console.error('Mouse move handler error:', error);
        }
    });
    
    // Click to launch ball OR fire laser
    canvas.addEventListener('click', () => {
        try {
            if (gameState.state !== 'playing') return;
            
            // If ball is caught on sticky paddle, launch it
            if (paddle.caughtBall) {
                paddle.launchCaughtBall();
                return;
            }
            
            // Check if Laser Cannon is active
            const laserActive = powerUpSystem.activePowerUps.some(
                p => p.type === PowerUpType.LASER_CANNON
            );
                    
            if (laserActive) {
                fireLaser(paddle, powerUpSystem, scene);
            } else if (!gameState.ballLaunched) {
                ballManager.launchAll();
            }
            
            // Check if Ice Beam is active
            const iceActive = powerUpSystem.activePowerUps.some(
                p => p.type === PowerUpType.ICE_BEAM
            );
            
            if (iceActive) {
                fireIceBeam(paddle, powerUpSystem, bricks, scene, freezeBrick);
            }
            
            // Check if Homing Missiles are active
            const homingActive = powerUpSystem.activePowerUps.some(
                p => p.type === PowerUpType.HOMING_MISSILES
            );
            
            if (homingActive && gameState.homingMissilesAllowed > 0) {
                launchHomingMissile(paddle, powerUpSystem, scene);
                gameState.homingMissilesAllowed--;
            }
            
            // Check if Banker Bomb is active
            const bankerActive = powerUpSystem.activePowerUps.some(
                p => p.type === PowerUpType.BANKER_BOMB
            );
            
            if (bankerActive && !gameState.bankerUsed) {
                summonTheBanker(powerUpSystem, scene, camera);
                gameState.bankerUsed = true;
            }
        } catch (error) {
            console.error('Click handler error:', error);
        }
    });
    
    // Flamethrower: Mouse down for continuous stream
    let flamethrowerActive = false;
    canvas.addEventListener('mousedown', (e) => {
        if (gameState.state !== 'playing') return;
        
        // Check if Flamethrower is active
        const flamethrowerActiveCheck = powerUpSystem.activePowerUps.some(
            p => p.type === PowerUpType.FLAMETHROWER
        );
        
        if (flamethrowerActiveCheck) {
            flamethrowerActive = true;
            startFlamethrower(paddle, powerUpSystem, bricks, scene);
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        if (flamethrowerActive) {
            flamethrowerActive = false;
            stopFlamethrower(scene);
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        if (flamethrowerActive) {
            flamethrowerActive = false;
            stopFlamethrower(scene);
        }
    });
    
    // Keyboard
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Escape') {
            if (gameState.state === 'playing') {
                togglePause();
            } else if (gameState.state === 'paused') {
                togglePause();
            }
        }
        
        // Ball type switching for testing (number keys 1-9)
        if (gameState.state === 'playing') {
            const keyMap = {
                'Digit1': BallType.TENNIS,
                'Digit2': BallType.DISCO,
                'Digit3': BallType.BASKETBALL,
                'Digit4': BallType.CRYSTAL,
                'Digit5': BallType.BLACK_HOLE,
                'Digit6': BallType.SPLIT,
                'Digit7': BallType.GHOST,
                'Digit8': BallType.BOOMERANG,
                'Digit9': BallType.INFLATABLE
            };
            
            if (keyMap[e.code]) {
                ballManager.setType(keyMap[e.code], scene);
                console.log(`Switched to ${BALL_CONFIGS[keyMap[e.code]].name}`);
            }
            
            // Fire Laser Cannon with Space (if active)
            if (e.code === 'Space') {
                const laserActive = powerUpSystem.activePowerUps.some(
                    p => p.type === PowerUpType.LASER_CANNON
                );
                if (laserActive) {
                    fireLaser(paddle, powerUpSystem, scene);
                }
            }
            
            // Fire Ice Beam with Control (if active)
            if (e.code === 'ControlLeft') {
                const iceActive = powerUpSystem.activePowerUps.some(
                    p => p.type === PowerUpType.ICE_BEAM
                );
                if (iceActive) {
                    fireIceBeam(paddle, powerUpSystem, bricks, scene);
                }
            }
            
            // Launch Homing Missile with Q key (if active)
            if (e.code === 'KeyQ') {
                const homingActive = powerUpSystem.activePowerUps.some(
                    p => p.type === PowerUpType.HOMING_MISSILES
                );
                if (homingActive && gameState.homingMissilesAllowed > 0) {
                    launchHomingMissile(paddle, powerUpSystem, scene);
                    gameState.homingMissilesAllowed--;
                }
            }
            
            // Summon The Banker with B key (if active)
            if (e.code === 'KeyB') {
                const bankerActive = powerUpSystem.activePowerUps.some(
                    p => p.type === PowerUpType.BANKER_BOMB
                );
                if (bankerActive && !gameState.bankerUsed) {
                    summonTheBanker(powerUpSystem, scene, camera);
                    gameState.bankerUsed = true;
                }
            }
        }
    });
}

export function togglePause() {
    if (gameState.state === 'playing') {
        gameState.state = 'paused';
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.remove('hidden');
        }
    } else if (gameState.state === 'paused') {
        gameState.state = 'playing';
        const pauseScreen = document.getElementById('pause-screen');
        if (pauseScreen) {
            pauseScreen.classList.add('hidden');
        }
        // FIX: must pass all required args and use module-level lastTime (not gameState.lastTime which doesn't exist)
        // Reset lastTime so the first post-pause frame doesn't produce a giant frameTime spike
        lastTime = performance.now();
        requestAnimationFrame((time) => gameLoop(time, _scene, _camera, _renderer, 0));
    }
}

/**
 * UI Setup with error handling
 */
export function setupUI(scene) {
    try {
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.onclick = () => {
                try {
                    startGame(scene);
                } catch (error) {
                    console.error('Error starting game:', error);
                }
            };
        }
        
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                try {
                    // Open settings modal with lazy loading
                    import('./game-settings.js').then(({ createSettingsUI }) => {
                        try {
                            createSettingsUI();
                        } catch (error) {
                            console.error('Error creating settings UI:', error);
                        }
                    }).catch(error => {
                        console.error('Failed to load settings module:', error);
                    });
                } catch (error) {
                    console.error('Error opening settings:', error);
                }
            };
        }
        
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.onclick = () => {
                try {
                    // Load save functionality
                } catch (error) {
                    console.error('Error loading save:', error);
                }
            };
        }
        
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            resumeBtn.onclick = () => {
                try {
                    togglePause();
                } catch (error) {
                    console.error('Error resuming game:', error);
                }
            };
        }
        
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.onclick = () => {
                try {
                    document.getElementById('pause-screen').classList.add('hidden');
                    startGame(scene);
                } catch (error) {
                    console.error('Error restarting game:', error);
                }
            };
        }
        
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.onclick = () => {
                try {
                    startGame(scene);
                } catch (error) {
                    console.error('Error retrying game:', error);
                }
            };
        }
        
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.onclick = () => {
                try {
                    startGame(scene);
                } catch (error) {
                    console.error('Error playing again:', error);
                }
            };
        }
    } catch (error) {
        console.error('❌ Error setting up UI:', error);
    }
}

/**
 * MAIN GAME LOOP (CORE-14: fixed timestep)
 * Includes comprehensive error handling for all render paths
 */
const PHYSICS_DT = 1 / 60;
let lastTime = 0;
let accumulator = 0;
// Module-level refs so togglePause can relaunch the loop with correct args
let _scene = null;
let _camera = null;
let _renderer = null;

export function gameLoop(currentTime, scene, camera, renderer, deltaTime) {
    try {
        if (gameState.state !== 'playing') {
            // Still render but don't update physics
            if (gameState.state === 'start' || gameState.state === 'paused') {
                renderer.render(scene, camera);
            }
            requestAnimationFrame((time) => gameLoop(time, scene, camera, renderer, deltaTime));
            return;
        }
        
        // Debug logging for first frame of gameplay
        if (!gameState.debugLogged) {
            console.log('GAME LOOP RUNNING - State:', gameState.state, 'Bricks:', bricks.items.length, 'Balls:', ballManager.balls.length);
            gameState.debugLogged = true;
        }
        
        const frameTime = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
        accumulator += frameTime;
        
        // Fixed timestep physics with time scale
        while (accumulator >= PHYSICS_DT) {
            // Apply time scale to physics step
            const scaledDt = PHYSICS_DT * (gameState.globalTimeScale || 1);
            
            // Update paddle
            paddle.update(scaledDt, mouseX, scene);
            
            // Update all balls
            ballManager.updateAll(scaledDt, paddle, scene, triggerAutoWin, checkLifeLost);
            
            // Update enhanced ball abilities (gravity well, inflatable growth, etc.)
            ballAbilities.updateAllAbilities(ballManager.balls, bricks, paddle, scene, scaledDt);
            
            // Check brick collisions for each ball
            // FIX: use ballManager.balls directly — the authoritative live array that updateAll() also iterates.
            // gameState.activeBalls can drift to a stale reference after checkLifeLost reassignments.
            ballManager.balls.forEach((ball, idx) => {
                checkBrickCollision(ball, bricks, scene);
            });
            
            // Clear gravity wells
            gameState.activeGravityWells = [];
            
            // Check combo timeout
            if (Date.now() - gameState.lastHitTime > CONSTANTS.COMBO_TIMEOUT && gameState.combo > 0) {
                gameState.combo = 0;
                updateHUD();
            }
            
            accumulator -= PHYSICS_DT;
        }
        
        // Update effects (variable rate)
        particleSystem.update(frameTime);
        updateScreenShake(frameTime);
        
        // Update Fnlloyd particle body (12,000 particles with interference patterns)
        updateFnlloyd(frameTime);
        
        // Update power-up system
        powerUpSystem.update(frameTime, paddle, gameState.globalTimeScale, removeTimeWarpEffect, scene);
        
        // Adjust music intensity based on gameplay
        audioSystem.adjustMusicIntensity(gameState);
        
        // Update Flamethrower effects
        updateFlamethrower(paddle, powerUpSystem, scene, frameTime);
        
        // Update frozen bricks and ball interactions
        updateFrozenBricks();
        cleanupFrozenBricks();
        
        // Update homing missiles
        updateHomingMissiles(deltaTime, bricks, scene, explodeMissile);
        
        // Update The Banker (if active)
        updateTheBanker(deltaTime, scene);
        
        // Check power-up collection by paddle
        powerUpSystem.checkCollection(paddle);
        
        // Render
        renderer.render(scene, camera);
        
        requestAnimationFrame((time) => gameLoop(time, scene, camera, renderer, deltaTime));
    } catch (error) {
        console.error('❌ CRITICAL ERROR in game loop:', error);
        console.error('Stack trace:', error.stack);
        
        // Try to continue running - don't break the loop
        try {
            requestAnimationFrame((time) => gameLoop(time, scene, camera, renderer, deltaTime));
        } catch (restartError) {
            console.error('❌ Failed to restart game loop:', restartError);
        }
    }
}

/**
 * Initialization with comprehensive error handling
 */
export function init(scene, camera, renderer, canvas, deltaTime) {
    try {
        // Initialize error tracker first to capture all subsequent errors
        errorTracker.init();
        errorTracker.loadFromStorage();
        
        console.log('🔍 Error tracker active - monitoring all console errors');
        
        // Store module-level refs for togglePause and any other non-loop code that needs them
        _scene = scene;
        _camera = camera;
        _renderer = renderer;

        // Initialize audio system
        audioSystem.init().catch(error => {
            console.error('⚠️ Audio initialization failed:', error);
            console.warn('Game will continue without audio');
        });
        
        // Create Entities
        paddle.init(scene);
        ballManager.init(scene);
        bricks.init(scene);
        particleSystem.init(scene);
        
        // Initialize Fnlloyd - Particle-silhouette Art-Deco AI Companion (12,000 particles)
        initFnlloyd(scene);
        
        // Setup
        setupInput(canvas, renderer, scene, camera);
        setupUI(scene);
        
        // Store camera reference for screen shake
        gameState.camera = camera;
        
        // Start
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.classList.add('hidden');
        }
        gameState.state = 'start';
        
        // Initial render
        renderer.render(scene, camera);
        
        // Start the game loop
        requestAnimationFrame((time) => gameLoop(time, scene, camera, renderer, 0));
        
        console.log('✅ Game initialized successfully');
    } catch (error) {
        console.error('❌ CRITICAL ERROR during initialization:', error);
        console.error('Stack trace:', error.stack);
        
        // Show user-friendly error message
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div style="color: #ff4444; font-family: monospace; padding: 20px;">
                    <h2>Initialization Error</h2>
                    <p>The game encountered a critical error during startup.</p>
                    <p style="font-size: 12px; opacity: 0.7;">Check browser console for details</p>
                </div>
            `;
        }
        
        throw error; // Re-throw to stop execution if critical components fail
    }
}
