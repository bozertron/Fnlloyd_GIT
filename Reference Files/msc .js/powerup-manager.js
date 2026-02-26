// ============================================
// POWER-UP MANAGER SYSTEM
// ============================================
import * as THREE from 'three';
import { CONSTANTS, PowerUpType, POWERUP_CONFIGS } from './constants.js';
import { gameState } from './state.js';
import { playSound } from './audio-placeholder.js';
import { spawnParticles } from './particle-system.js';
import { cleanupMissiles } from './homing-missiles.js';
import { addScore, levelComplete, createTimeWarpEffect, removeTimeWarpEffect } from './game-loop.js';
import { ballManager } from './entity-systems.js';
import { paddle } from './entity-systems.js';
import { fnlloydOnEvent } from './fnlloyd-entity.js';

/**
 * Power-up drop and activation system
 */
export const powerUpSystem = {
    activePowerUps: [],
    drops: [], // Falling power-ups
    
    /**
     * Check if brick should drop power-up
     */
    checkDrop(brick, scene) {
        const isGreenBrick = brick.type === 2 && brick.maxHp > 1; // Multi-hit = green
        const isBlueBrick = brick.type === 1 && Math.random() < 0.05; // 5% from standard
        
        if (isGreenBrick || isBlueBrick) {
            const dropChance = isGreenBrick ? 1.0 : 0.15; // 100% green, 15% blue
            
            if (Math.random() < dropChance) {
                const powerUpType = this.selectPowerUp(isGreenBrick ? 'weapon' : 'paddle');
                this.spawnDrop(powerUpType, brick.x, brick.y, scene);
            }
        }
    },
    
    /**
     * Select random power-up based on type and rarity
     */
    selectPowerUp(category) {
        const types = Object.keys(POWERUP_CONFIGS).filter(
            key => POWERUP_CONFIGS[key].type === category
        );
        
        // Weight by rarity (simplified - equal chance for now)
        const selectedKey = types[Math.floor(Math.random() * types.length)];
        return PowerUpType[selectedKey];
    },
    
    /**
     * Spawn falling power-up with visual effects
     */
    spawnDrop(type, x, y, scene) {
        const config = POWERUP_CONFIGS[type];
        const drop = {
            type: type,
            x: x,
            y: y,
            vy: -100, // Initial upward pop
            radius: 15,
            mesh: null,
            collected: false,
            sceneRef: scene,
            
            init() {
                const geo = new THREE.CircleGeometry(this.radius, 16);
                const mat = new THREE.MeshBasicMaterial({ 
                    color: config.color,
                    transparent: true,
                    opacity: 0.8
                });
                this.mesh = new THREE.Mesh(geo, mat);
                this.mesh.position.set(this.x, this.y, 0);
                this.sceneRef.add(this.mesh);
                
                // Add glow ring
                const ringGeo = new THREE.RingGeometry(this.radius * 1.2, this.radius * 1.4, 16);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: config.color,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.z = -1;
                this.mesh.add(ring);
            },
            
            update(dt) {
                if (this.collected || !this.mesh) return;
                
                // Apply gravity
                this.vy += 500 * dt; // Gravity
                this.y += this.vy * dt;
                this.mesh.position.y = this.y;
                
                // Rotate for visual effect
                this.mesh.rotation.z += 2 * dt;
                
                // Glow pulse effect
                const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
                this.mesh.scale.set(pulse, pulse, pulse);
                
                // Check if off screen
                if (this.y < -CONSTANTS.GAME_HEIGHT / 2 - 50) {
                    this.destroy();
                }
            },
            
            destroy() {
                if (this.mesh && this.sceneRef) {
                    this.sceneRef.remove(this.mesh);
                    this.mesh.geometry.dispose();
                    this.mesh.material.dispose();
                }
                this.collected = true;
            }
        };
        
        drop.init();
        this.drops.push(drop);
    },
    
    /**
     * Check paddle collision with power-up drops
     */
    checkCollection(paddle) {
        // Type safety: validate drops is an array
        if (!Array.isArray(this.drops)) {
            console.warn('powerUpSystem.drops is not an array');
            return;
        }
        
        for (const drop of this.drops) {
            if (drop.collected) continue;
            
            const dx = drop.x - paddle.x;
            const dy = drop.y - paddle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < paddle.width / 2 + drop.radius) {
                // Add particles on collection
                const config = POWERUP_CONFIGS[drop.type];
                spawnParticles(drop.x, drop.y, config.color, 20);
                
                // Play collection sound
                playSound('powerup_collect');
                
                // Notify Fnlloyd of power-up collection
                fnlloydOnEvent('powerUpCollected');
                
                this.activate(drop.type, paddle, ballManager);
                drop.destroy();
            }
        }
        
        // Remove collected/off-screen drops
        this.drops = this.drops.filter(d => !d.collected && d.y >= -CONSTANTS.GAME_HEIGHT / 2 - 50);
    },
    
    /**
     * Activate power-up effect
     */
    activate(type, paddleRef, ballManagerRef, scene) {
        const p = paddleRef || paddle;
        const bm = ballManagerRef || ballManager;
        const config = POWERUP_CONFIGS[type];
        console.log(`Power-up activated: ${config.name}`);
        playSound('powerup');
        
        const activeEffect = {
            type: type,
            startTime: Date.now(),
            duration: config.duration,
            expiresAt: config.duration ? Date.now() + config.duration : null,
            usesRemaining: config.uses || null,
            mesh: null
        };
        
        // Apply effect based on type
        switch(type) {
            case PowerUpType.MULTI_BALL:
                // Spawn 2 extra balls
                for (let i = 0; i < 2; i++) {
                    const newBall = bm.create(
                        gameState.currentBallType,
                        p.x,
                        p.y + 20,
                        (Math.random() - 0.5) * 200,
                        -CONSTANTS.BALL_SPEED_BASE,
                        scene
                    );
                    bm.balls.push(newBall);
                    gameState.activeBalls.push(newBall);
                }
                break;
            
            case PowerUpType.LASER_CANNON:
                activeEffect.canFire = true;
                activeEffect.lastFireTime = 0;
                break;
            
            case PowerUpType.EXTENDED_LENGTH:
                p.width += config.widthBonus;
                p.mesh.scale.x = p.width / CONSTANTS.PADDLE_WIDTH;
                break;
            
            case PowerUpType.STICKY_PADDLE:
                p.activateSticky();
                break;
            
            case PowerUpType.MAGNETIC_EDGE:
                activeEffect.pullStrength = config.pullStrength;
                // Create magnetic field visual
                p.createMagneticField();
                break;
            
            case PowerUpType.SHIELD:
                activeEffect.uses = config.uses || 1;
                // Create shield visual
                p.createShield();
                break;
            
            case PowerUpType.TIME_WARP:
                activeEffect.timeScale = config.timeScale;
                gameState.globalTimeScale = config.timeScale || 0.5;
                document.body.style.filter = 'saturate(0.5)';
                if (scene) {
                    createTimeWarpEffect(scene);
                }
                playSound('timeWarp');
                break;
            
            case PowerUpType.HOMING_MISSILES:
                // Allow 10 missiles during power-up duration
                gameState.homingMissilesAllowed = 10;
                activeEffect.missilesRemaining = gameState.homingMissilesAllowed;
                break;
            
            case PowerUpType.BANKER_BOMB:
                // The Banker is a one-time summon
                activeEffect.canSummon = true;
                gameState.bankerUsed = false;
                break;
            
            // Other power-ups handled in game loop
        }
        
        this.activePowerUps.push(activeEffect);
        
        // Show notification
        this.showNotification(config.name);
    },
    
    /**
     * Update power-ups (check expiration, animate drops)
     */
    update(dt, paddleRef, globalTimeScaleRef, removeTimeWarpEffectFn, sceneRef) {
        const p = paddleRef || paddle;
        const now = Date.now();
        
        // Type safety: validate drops is an array
        if (Array.isArray(this.drops)) {
            this.drops.forEach(drop => drop.update(dt));
        }
        
        // Type safety: validate activePowerUps is an array
        if (!Array.isArray(this.activePowerUps)) {
            console.warn('powerUpSystem.activePowerUps is not an array');
            return;
        }
        
        // Check power-up expiration
        for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
            const powerUp = this.activePowerUps[i];
            const config = POWERUP_CONFIGS[powerUp.type];
            
            // Check sticky paddle catch-based expiration
            if (powerUp.type === PowerUpType.STICKY_PADDLE) {
                if (!p.stickyActive || p.stickyCatchesRemaining <= 0) {
                    this.deactivate(i, p, globalTimeScaleRef, removeTimeWarpEffectFn, sceneRef);
                    continue;
                }
            }
            
            // Check time expiration
            if (powerUp.expiresAt && now >= powerUp.expiresAt) {
                this.deactivate(i, p, globalTimeScaleRef, removeTimeWarpEffectFn, sceneRef);
                continue;
            }
            
            // Update shield position
            if (powerUp.type === PowerUpType.SHIELD && powerUp.mesh) {
                powerUp.mesh.position.x = p.x;
                powerUp.mesh.position.y = p.y;
            }
        }
    },
    
    /**
     * Deactivate single power-up and reverse effects
     */
    deactivate(index, paddleRef, globalTimeScaleRef, removeTimeWarpEffectFn, sceneRef) {
        const p = paddleRef || paddle;
        
        // Type safety: validate activePowerUps is an array
        if (!Array.isArray(this.activePowerUps)) {
            console.warn('powerUpSystem.activePowerUps is not an array');
            return;
        }
        
        const powerUp = this.activePowerUps[index];
        
        // Early return if power-up doesn't exist
        if (!powerUp) {
            console.warn(`Power-up at index ${index} does not exist`);
            return;
        }
        
        const config = POWERUP_CONFIGS[powerUp.type];
        
        // Type safety: validate config exists
        if (!config) {
            console.warn(`Power-up config not found for type: ${powerUp.type}`);
            return;
        }
        
        const scene = sceneRef;
        
        console.log(`Power-up expired: ${config.name}`);
        playSound('powerdown');
        
        // Reverse effects
        if (powerUp.type === PowerUpType.EXTENDED_LENGTH) {
            p.width -= config.widthBonus;
            p.mesh.scale.x = p.width / CONSTANTS.PADDLE_WIDTH;
        }
        
        // Remove Sticky Paddle
        if (powerUp.type === PowerUpType.STICKY_PADDLE) {
            p.deactivateSticky();
        }
                    
        // Remove Magnetic Edge field
        if (powerUp.type === PowerUpType.MAGNETIC_EDGE) {
            p.removeMagneticField();
        }
                    
        // Remove Shield
        if (powerUp.type === PowerUpType.SHIELD) {
            p.removeShield();
        }
        
        // Reset Time Warp
        if (powerUp.type === PowerUpType.TIME_WARP) {
            gameState.globalTimeScale = 1;
            gameState.timeWarpEndTime = null;
            document.body.style.filter = '';
            if (removeTimeWarpEffectFn && scene) {
                removeTimeWarpEffectFn(scene);
            }
            playSound('timeWarpEnd');
        }
        
        // Remove mesh
        if (powerUp.mesh && scene) {
            scene.remove(powerUp.mesh);
            powerUp.mesh.geometry.dispose();
            powerUp.mesh.material.dispose();
        }
        
        this.activePowerUps.splice(index, 1);
    },
    
    /**
     * Show power-up notification
     */
    showNotification(name) {
        const notification = document.createElement('div');
        notification.className = 'powerup-notification';
        notification.textContent = `${name} Activated!`;
        notification.style.cssText = `
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    },
    
    /**
     * Clear all power-ups (on life lost)
     */
    clear(scene) {
        // Type safety: validate drops is an array
        if (Array.isArray(this.drops)) {
            this.drops.forEach(drop => drop.destroy());
        }
        this.drops = [];
        
        // Cleanup homing missiles
        cleanupMissiles(scene);
        
        // Type safety: validate activePowerUps is an array
        if (Array.isArray(this.activePowerUps)) {
            this.activePowerUps.forEach((_, idx) => this.deactivate(idx, paddle, 1.0, null, scene));
        }
        this.activePowerUps = [];
    }
};