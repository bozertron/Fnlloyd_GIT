// ============================================
// FLAMETHROWER SYSTEM (Priority 1.2)
// ============================================
import * as THREE from 'three';
import { CONSTANTS, PowerUpType } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { powerUpSystem } from './powerup-manager.js';
import { addScore, levelComplete } from './game-loop.js';
import { paddle, bricks } from './entity-systems.js';

const paddleWidth = CONSTANTS.PADDLE_WIDTH;

let flamethrowerActive = false;
let flamethrowerParticles = [];
let flamethrowerDamageInterval = null;

/**
 * Start continuous flamethrower stream
 * Hold-to-fire mechanic with cone damage
 */
export function startFlamethrower(paddle, powerUpSystem, damageBricksInCone) {
    const now = Date.now();
    
    // Find active Flamethrower power-up
    const flamethrowerPowerUp = powerUpSystem.activePowerUps.find(
        p => p.type === PowerUpType.FLAMETHROWER
    );
    
    if (!flamethrowerPowerUp) return;
    
    // Check cooldown (250ms between damage ticks)
    if (now - flamethrowerPowerUp.lastFireTime < 250) return;
    flamethrowerPowerUp.lastFireTime = now;
    
    // Play flamethrower sound
    playSound('flame');
    
    // Set active flag
    flamethrowerActive = true;
    
    // Deal damage to bricks in cone area every 250ms
    const coneLength = CONSTANTS.GAME_HEIGHT * 0.35; // Bottom third of screen
    flamethrowerDamageInterval = setInterval(() => {
        if (flamethrowerActive) {
            damageBricksInCone(paddle.x, paddle.y, coneLength);
        }
    }, 250);
}

/**
 * Stop flamethrower and clean up resources
 */
export function stopFlamethrower(scene) {
    flamethrowerActive = false;
    
    // Clear damage interval
    if (flamethrowerDamageInterval) {
        clearInterval(flamethrowerDamageInterval);
        flamethrowerDamageInterval = null;
    }
    
    // Clean up particles
    flamethrowerParticles.forEach(p => {
        scene.remove(p.mesh);
        p.geometry.dispose();
        p.material.dispose();
    });
    flamethrowerParticles = [];
}

/**
 * Update flamethrower particle stream each frame
 */
export function updateFlamethrower(paddle, powerUpSystemRef, sceneRef, deltaTime) {
    const pps = powerUpSystemRef || powerUpSystem;
    if (!flamethrowerActive || !pps) return;
    
    const flamethrowerPowerUp = pps.activePowerUps.find(
        p => p.type === PowerUpType.FLAMETHROWER
    );
    
    if (!flamethrowerPowerUp) return;
    
    const coneLength = CONSTANTS.GAME_HEIGHT * 0.35;
    
    // Create continuous stream of orange/yellow particles
    for (let i = 0; i < 5; i++) {
        const t = Math.random() * 0.4; // Particles in bottom 40% of cone
        const spreadX = (paddle.width / 2) * t * 0.5;
        const x = paddle.x + (Math.random() - 0.5) * 2 * spreadX;
        const y = paddle.y + 5 + Math.random() * 20; // Start just below paddle
        
        const particleGeo = new THREE.SphereGeometry(0.2, 4, 4);
        const particleMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xff6600 : 0xffcc00, // Orange or yellow
            transparent: true,
            opacity: 0.9
        });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        particle.position.set(x, y, 0);
        particle.velocityY = 0.08 + Math.random() * 0.04;
        sceneRef.add(particle);
        flamethrowerParticles.push({
            mesh: particle,
            geometry: particleGeo,
            material: particleMat,
            life: 1.0
        });
    }
    
    // Update existing particles
    for (let i = flamethrowerParticles.length - 1; i >= 0; i--) {
        const p = flamethrowerParticles[i];
        p.mesh.position.y += p.velocityY;
        p.life -= deltaTime * 1.5; // Fade out over ~0.67s
        p.mesh.material.opacity = p.life * 0.9;
        
        if (p.life <= 0) {
            sceneRef.remove(p.mesh);
            p.geometry.dispose();
            p.material.dispose();
            flamethrowerParticles.splice(i, 1);
        }
    }
}

/**
 * Deal damage to all bricks within cone-shaped area
 */
export function damageBricksInCone(paddleX, paddleY, coneLength, bricks, addScore, levelComplete, camera) {
    const flamethrowerPowerUp = powerUpSystem.activePowerUps.find(
        p => p.type === PowerUpType.FLAMETHROWER
    );
    
    if (!flamethrowerPowerUp) return;
    
    let hitCount = 0;
    
    for (const brick of bricks.items) {
        if (brick.hp <= 0 || brick.isIndestructible) continue;
        
        const brickBottom = brick.y - brick.height / 2;
        const brickTop = brick.y + brick.height / 2;
        
        // Must be below paddle and within cone length
        if (brickBottom < paddleY || brickTop > paddleY + coneLength) continue;
        
        // Cone widens as it goes down (40% spread)
        const distanceFromPaddle = brickBottom - paddleY;
        const coneWidthAtDepth = paddle.width + distanceFromPaddle * 0.4;
        const distFromCenter = Math.abs(brick.x - paddleX);
        
        // Check if brick is within cone width at its depth
        if (distFromCenter <= coneWidthAtDepth / 2) {
            // Damage-over-time stacking
            if (!brick.fireDamageStacks) brick.fireDamageStacks = 0;
            brick.fireDamageStacks++;
            
            // Damage per stack
            const damagePerSecond = 50 * brick.fireDamageStacks;
            brick.hp -= damagePerSecond * 0.016; // Assuming 60 FPS
            
            // Visual feedback - burning effect
            if (Math.random() < 0.3) {
                spawnParticles(
                    brick.x + (Math.random() - 0.5) * brick.width,
                    brick.y + (Math.random() - 0.5) * brick.height,
                    0xff6600,
                    2
                );
            }
            
            // Damage brick
            if (brick.maxHp <= 1) {
                // Instant destroy weak bricks
                brick.hp = 0;
                brick.fireDamageStacks = 0;  // Reset stacks on destroy
                brick.mesh.visible = false;
                gameState.bricksRemaining--;
                addScore(80, brick.x, brick.y);
                spawnParticles(brick.x, brick.y, 0xff6600, 12);
                playSound('burn');
                hitCount++;
                
                if (gameState.bricksRemaining <= 0) {
                    levelComplete();
                }
            } else {
                // Damage over time to stronger bricks
                brick.hp--;
                spawnParticles(brick.x, brick.y, 0xff9933, 6);
                playSound('burn');
                hitCount++;
                
                // Orange flash effect
                brick.mesh.material.color.setHex(0xffaa00);
                setTimeout(() => {
                    if (brick.mesh) brick.mesh.material.color.setHex(brick.getColor());
                }, 100);
            }
        }
    }
    
    // Small screen shake on hit
    if (hitCount > 0 && camera) {
        camera.position.y += (Math.random() - 0.5) * 0.3;
        setTimeout(() => {
            camera.position.set(0, 0, 10);
        }, 50);
    }
}

/**
 * Check if flamethrower is currently active
 */
export function isFlamethrowerActive() {
    return flamethrowerActive;
}
