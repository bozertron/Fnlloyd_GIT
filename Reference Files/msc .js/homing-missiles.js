// ============================================
// HOMING MISSILES SYSTEM (Priority 1.4)
// ============================================
import * as THREE from 'three';
import { CONSTANTS, PowerUpType } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { addScore, levelComplete } from './game-loop.js';
import { bricks } from './entity-systems.js';

let activeMissiles = [];

/**
 * Launch homing missile that tracks nearest brick
 */
export function launchHomingMissile(paddle, powerUpSystem, scene) {
    const homingPowerUp = powerUpSystem.activePowerUps.find(
        p => p.type === PowerUpType.HOMING_MISSILES
    );
    
    if (!homingPowerUp) return;
    
    // Launch from paddle center
    const missileGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const missileMat = new THREE.MeshBasicMaterial({
        color: 0xff3366,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const missile = new THREE.Mesh(missileGeo, missileMat);
    missile.position.set(paddle.x, paddle.y + 5, 0);
    missile.velocity = new THREE.Vector3(0, 0.5, 0);
    missile.speed = 0.3;
    missile.turnRate = 0.08; // How fast it can turn
    scene.add(missile);
    
    activeMissiles.push({
        mesh: missile,
        geometry: missileGeo,
        material: missileMat,
        life: 8.0, // 8 second lifetime
        smokeTrail: []
    });
    
    // Play missile launch sound
    playSound('missile');
}

/**
 * Update all active homing missiles
 */
export function updateHomingMissiles(deltaTime, bricksRef, sceneRef, explodeFn) {
    if (activeMissiles.length === 0) return;
    
    // Use passed in references or fall back to module-level
    const brickData = bricksRef || bricks;
    const sceneRefLocal = sceneRef;
    const explodeFnLocal = explodeFn || (missile => explodeMissile(missile, null, sceneRefLocal, null, brickData));
    
    // Find nearest brick for each missile
    for (let i = activeMissiles.length - 1; i >= 0; i--) {
        const missile = activeMissiles[i];
        missile.life -= deltaTime;
        
        if (missile.life <= 0) {
            // Missile expired
            explodeFnLocal(missile);
            continue;
        }
        
        // Find nearest brick
        let targetBrick = null;
        let minDistance = Infinity;
        let bestTargetScore = -Infinity;

        for (const brick of brickData.items) {
            if (brick.hp <= 0 || brick.isIndestructible) continue;
            
            const dx = brick.x - missile.mesh.position.x;
            const dy = brick.y - missile.mesh.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Score target - closer + lower HP = better target
            const targetScore = (100 - distance) + (brick.maxHp - brick.hp) * 10;
            
            if (targetScore > bestTargetScore) {
                bestTargetScore = targetScore;
                minDistance = distance;
                targetBrick = brick;
            }
        }
        
        // Guide missile toward target
        if (targetBrick) {
            const targetX = targetBrick.x;
            const targetY = targetBrick.y;
            
            // Calculate direction to target
            const dx = targetX - missile.mesh.position.x;
            const dy = targetY - missile.mesh.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Normalize and apply speed
                const dirX = dx / dist;
                const dirY = dy / dist;
                
                // Smoothly interpolate current velocity toward target direction
                missile.velocity.x += (dirX - missile.velocity.x) * missile.turnRate;
                missile.velocity.y += (dirY - missile.velocity.y) * missile.turnRate;
                
                // Normalize velocity
                const velLen = Math.sqrt(
                    missile.velocity.x * missile.velocity.x +
                    missile.velocity.y * missile.velocity.y
                );
                if (velLen > 0) {
                    missile.velocity.x = (missile.velocity.x / velLen) * missile.speed;
                    missile.velocity.y = (missile.velocity.y / velLen) * missile.speed;
                }
            }
            
            // Check collision with target brick
            const brickLeft = targetBrick.x - targetBrick.width / 2;
            const brickRight = targetBrick.x + targetBrick.width / 2;
            const brickBottom = targetBrick.y - targetBrick.height / 2;
            const brickTop = targetBrick.y + targetBrick.height / 2;
            
            const mx = missile.mesh.position.x;
            const my = missile.mesh.position.y;
            
            if (mx >= brickLeft && mx <= brickRight && 
                my >= brickBottom && my <= brickTop) {
                explodeFnLocal(missile);
                continue;
            }
        } else {
            // No bricks left, fly straight up
            missile.velocity.x += (0 - missile.velocity.x) * missile.turnRate;
            missile.velocity.y += (1 - missile.velocity.y) * missile.turnRate;
            const velLen = Math.sqrt(
                missile.velocity.x * missile.velocity.x +
                missile.velocity.y * missile.velocity.y
            );
            if (velLen > 0) {
                missile.velocity.x = (missile.velocity.x / velLen) * missile.speed;
                missile.velocity.y = (missile.velocity.y / velLen) * missile.speed;
            }
        }
        
        // Update position
        missile.mesh.position.x += missile.velocity.x;
        missile.mesh.position.y += missile.velocity.y;
        
        // Create smoke trail
        if (Math.random() < 0.5 && sceneRefLocal) { // 50% chance per frame
            const smokeGeo = new THREE.SphereGeometry(0.15, 4, 4);
            const smokeMat = new THREE.MeshBasicMaterial({
                color: 0x666666, // Gray smoke
                transparent: true,
                opacity: 0.6
            });
            const smoke = new THREE.Mesh(smokeGeo, smokeMat);
            smoke.position.copy(missile.mesh.position);
            smoke.life = 0.5; // Short lifetime
            sceneRefLocal.add(smoke);
            
            // Store smoke for cleanup
            missile.smokeTrail = missile.smokeTrail || [];
            missile.smokeTrail.push({
                mesh: smoke,
                geometry: smokeGeo,
                material: smokeMat,
                life: 0.5
            });
        }
        
        // Update smoke trail
        if (missile.smokeTrail && sceneRefLocal) {
            for (let j = missile.smokeTrail.length - 1; j >= 0; j--) {
                const smoke = missile.smokeTrail[j];
                smoke.life -= deltaTime;
                smoke.mesh.material.opacity = smoke.life * 0.6;
                
                if (smoke.life <= 0) {
                    sceneRefLocal.remove(smoke.mesh);
                    smoke.geometry.dispose();
                    smoke.material.dispose();
                    missile.smokeTrail.splice(j, 1);
                }
            }
        }
    }
}

/**
 * Explode missile and deal damage
 */
export function explodeMissile(missile, targetBrick, sceneRef, cameraRef, brickData) {
    const explosionX = missile.mesh.position.x;
    const explosionY = missile.mesh.position.y;
    
    // Use module-level references if not provided
    const scene = sceneRef;
    const camera = cameraRef;
    const brickDataRef = brickData || bricks;
    
    // Remove missile
    if (scene && missile.mesh) {
        scene.remove(missile.mesh);
    }
    if (missile.geometry) missile.geometry.dispose();
    if (missile.material) missile.material.dispose();
    
    // Clean up smoke
    if (missile.smokeTrail) {
        missile.smokeTrail.forEach(s => {
            if (scene) scene.remove(s.mesh);
            s.geometry.dispose();
            s.material.dispose();
        });
    }
    
    // Remove from active list
    const index = activeMissiles.indexOf(missile);
    if (index > -1) activeMissiles.splice(index, 1);
    
    // Explosion effect
    spawnParticles(explosionX, explosionY, 0xff4400, 25);
    playSound('explosion');
    
    // Screen shake
    if (camera) {
        camera.position.x += (Math.random() - 0.5) * 0.8;
        camera.position.y += (Math.random() - 0.5) * 0.8;
        setTimeout(() => {
            camera.position.set(0, 0, 10);
        }, 100);
    }
    
    // Damage bricks in small AoE radius
    if (targetBrick) {
        damageBricksInRadiusLocal(explosionX, explosionY, 1.5);
    }
}

function damageBricksInRadiusLocal(centerX, centerY, radius) {
    let hitCount = 0;
    
    for (const brick of bricks.items) {
        if (brick.hp <= 0 || brick.isIndestructible) continue;
        
        const dx = brick.x - centerX;
        const dy = brick.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if brick center is within explosion radius
        if (dist <= radius) {
            if (brick.maxHp <= 1) {
                // Instant destroy weak bricks
                brick.hp = 0;
                brick.mesh.visible = false;
                gameState.bricksRemaining--;
                addScore(120, brick.x, brick.y);
                spawnParticles(brick.x, brick.y, 0xff6600, 15);
                playSound('break');
                hitCount++;
                
                if (gameState.bricksRemaining <= 0) {
                    levelComplete();
                }
            } else {
                // Damage stronger bricks
                brick.hp--;
                spawnParticles(brick.x, brick.y, 0xff8844, 8);
                playSound('hit');
                hitCount++;
                
                // Orange flash
                brick.mesh.material.color.setHex(0xffaa00);
                setTimeout(() => {
                    if (brick.mesh) brick.mesh.material.color.setHex(brick.getColor());
                }, 100);
            }
        }
    }
}

/**
 * Cleanup all missiles (on life lost or power-up expire)
 */
export function cleanupMissiles(scene) {
    // Validate scene parameter
    if (!scene) return;
    
    // Validate activeMissiles is an array
    if (!Array.isArray(activeMissiles)) return;
    
    activeMissiles.forEach(missile => {
        // Null check for missile mesh before removing from scene
        if (missile.mesh) {
            scene.remove(missile.mesh);
        }
        
        // Null checks before disposing geometry and material
        if (missile.geometry) missile.geometry.dispose();
        if (missile.material) missile.material.dispose();
        
        // Cleanup smoke trail with null checks
        if (missile.smokeTrail && Array.isArray(missile.smokeTrail)) {
            missile.smokeTrail.forEach(s => {
                if (s.mesh) scene.remove(s.mesh);
                if (s.geometry) s.geometry.dispose();
                if (s.material) s.material.dispose();
            });
        }
    });
    activeMissiles = [];
}

/**
 * Get array of active missiles
 */
export function getActiveMissiles() {
    return activeMissiles;
}

/**
 * Damage bricks within explosion radius (exported for external use)
 */
export function damageBricksInRadius(centerX, centerY, radius) {
    damageBricksInRadiusLocal(centerX, centerY, radius);
}
