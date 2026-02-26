// ============================================
// ICE BEAM SYSTEM (Priority 1.3)
// ============================================
import * as THREE from 'three';
import { CONSTANTS, PowerUpType } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { ballManager } from './entity-systems.js';

let iceBeams = [];
const frozenBricks = new Map(); // brick -> {endTime, originalColor}

/**
 * Fire ice beam that freezes bricks in its path
 */
export function fireIceBeam(paddle, powerUpSystem, bricks, scene, freezeBrick) {
    const now = Date.now();
    
    // Find active Ice Beam power-up
    const icePowerUp = powerUpSystem.activePowerUps.find(
        p => p.type === PowerUpType.ICE_BEAM
    );
    
    if (!icePowerUp) return;
    
    // Check cooldown (1s = 1000ms)
    if (now - icePowerUp.lastFireTime < 1000) return;
    icePowerUp.lastFireTime = now;
    
    // Create ice beam visual (blue/cyan line from paddle center)
    const beamHeight = CONSTANTS.GAME_HEIGHT * 0.4; // 40% of screen
    
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(paddle.x, paddle.y, 0),
        new THREE.Vector3(paddle.x, paddle.y + beamHeight, 0)
    ]);
    const beamMat = new THREE.LineBasicMaterial({ 
        color: 0x00ffff, 
        linewidth: 4,
        transparent: true,
        opacity: 0.8
    });
    const beam = new THREE.Line(beamGeo, beamMat);
    scene.add(beam);
    iceBeams.push({ mesh: beam, geometry: beamGeo, material: beamMat });
    
    // Remove beam after 0.8s
    setTimeout(() => {
        iceBeams.forEach(b => {
            scene.remove(b.mesh);
            b.geometry.dispose();
            b.material.dispose();
        });
        iceBeams = [];
    }, 800);
    
    // Play ice sound
    playSound('ice');
    
    // Freeze bricks in beam path
    let hitCount = 0;
    for (const brick of bricks.items) {
        if (brick.hp <= 0 || brick.isIndestructible) continue;
        
        const brickLeft = brick.x - brick.width / 2;
        const brickRight = brick.x + brick.width / 2;
        const brickBottom = brick.y - brick.height / 2;
        
        // Check if brick is in beam path (within horizontal range)
        if (paddle.x >= brickLeft && paddle.x <= brickRight && brickBottom > paddle.y) {
            freezeBrick(brick);
            hitCount++;
        }
    }
    
    // Spawn frost particles at impact
    if (hitCount > 0) {
        spawnParticles(paddle.x, paddle.y + beamHeight * 0.5, 0x00ffff, 20);
    }
}

/**
 * Freeze a single brick temporarily
 */
export function freezeBrick(brick) {
    const freezeDuration = 2000; // 2 seconds
    const now = Date.now();
    
    // Store original state
    const originalColor = brick.mesh.material.color.getHex();
    
    // Mark as frozen
    frozenBricks.set(brick, {
        endTime: now + freezeDuration,
        originalColor: originalColor
    });
    
    // Visual effect: turn ice blue
    brick.mesh.material.color.setHex(0x00ffff);
    brick.isFrozen = true;
    
    // Unfreeze after duration
    setTimeout(() => {
        if (frozenBricks.has(brick) && brick.mesh) {
            const frozenData = frozenBricks.get(brick);
            brick.mesh.material.color.setHex(frozenData.originalColor);
            brick.isFrozen = false;
            frozenBricks.delete(brick);
        }
    }, freezeDuration);
}

/**
 * Update ball collisions with frozen bricks
 */
export function updateFrozenBricks() {
    // Update ball collisions with frozen bricks
    const allBalls = ballManager.getAllBalls();
    
    for (const [brick, data] of frozenBricks) {
        if (!brick.mesh || brick.hp <= 0) {
            frozenBricks.delete(brick);
            continue;
        }
        
        // Check if balls hit this frozen brick
        for (const ball of allBalls) {
            if (!ball.active) continue;
            
            const dx = Math.abs(ball.x - brick.x);
            const dy = Math.abs(ball.y - brick.y);
            
            if (dx < (brick.width / 2 + ball.radius) && 
                dy < (brick.height / 2 + ball.radius)) {
                
                // Slow down ball significantly on frozen brick hit
                ball.vx *= 0.3; // Reduce to 30% speed
                ball.vy *= 0.3;
                
                // Minimum speed threshold
                const minSpeed = 100;
                if (Math.abs(ball.vx) < minSpeed) ball.vx = Math.sign(ball.vx) * minSpeed;
                if (Math.abs(ball.vy) < minSpeed) ball.vy = Math.sign(ball.vy) * minSpeed;
                
                // Spawn ice particles
                spawnParticles(brick.x, brick.y, 0x00ffff, 8);
            }
        }
    }
}

/**
 * Clean up expired frozen bricks
 */
export function cleanupFrozenBricks() {
    const now = Date.now();
    for (const [brick, data] of frozenBricks) {
        if (data.endTime <= now) {
            if (brick.mesh) {
                brick.mesh.material.color.setHex(data.originalColor);
            }
            brick.isFrozen = false;
            frozenBricks.delete(brick);
        }
    }
}

/**
 * Get map of currently frozen bricks
 */
export function getFrozenBricks() {
    return frozenBricks;
}
