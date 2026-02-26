// ============================================
// LASER CANNON SYSTEM (Priority 1.1)
// ============================================
import * as THREE from 'three';
import { CONSTANTS, PowerUpType } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { addScore, levelComplete } from './game-loop.js';
import { bricks } from './entity-systems.js';

/**
 * Fire laser beams from paddle tips
 * Destroys weak bricks instantly, damages stronger ones
 */
export function fireLaser(paddle, powerUpSystemRef, sceneRef) {
    const pps = powerUpSystemRef;
    const scene = sceneRef;
    const now = Date.now();
    
    // Type safety check for activePowerUps
    if (!Array.isArray(pps.activePowerUps)) return;
    
    // Find active Laser Cannon power-up
    const laserPowerUp = pps.activePowerUps.find(
        p => p.type === PowerUpType.LASER_CANNON
    );
    
    if (!laserPowerUp) return;
    
    // Check cooldown (0.5s = 500ms)
    if (now - laserPowerUp.lastFireTime < 500) return;
    laserPowerUp.lastFireTime = now;
    
    // Get power-up level for beam thickness
    const powerUpLevel = laserPowerUp.usesRemaining || 1;
    const beamWidth = 4 + (powerUpLevel || 1) * 2;
    
    // Create laser beam visual (thicker beams)
    const paddleLeft = paddle.x - paddle.width / 2;
    const paddleRight = paddle.x + paddle.width / 2;
    const beamHeight = CONSTANTS.GAME_HEIGHT / 2;
    
    // Left beam - use BoxGeometry for variable thickness
    const leftBeamGeo = new THREE.BoxGeometry(beamWidth / 10, beamHeight - paddle.y, 1);
    const leftBeamMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftBeam = new THREE.Mesh(leftBeamGeo, leftBeamMat);
    leftBeam.position.set(paddleLeft, (paddle.y + beamHeight) / 2, 0);
    scene.add(leftBeam);
    
    // Right beam
    const rightBeamGeo = new THREE.BoxGeometry(beamWidth / 10, beamHeight - paddle.y, 1);
    const rightBeamMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const rightBeam = new THREE.Mesh(rightBeamGeo, rightBeamMat);
    rightBeam.position.set(paddleRight, (paddle.y + beamHeight) / 2, 0);
    scene.add(rightBeam);
    
    // Remove beams after 0.5s
    setTimeout(() => {
        scene.remove(leftBeam);
        scene.remove(rightBeam);
        leftBeamGeo.dispose();
        leftBeamMat.dispose();
        rightBeamGeo.dispose();
        rightBeamMat.dispose();
    }, 500);
    
    // Play laser sound
    playSound('laser');
    
    // Handle laser collision with bricks
    hitBrickWithLaser(paddleLeft, paddleRight, beamHeight, scene);
}

// Create impact flash effect function
function createLaserImpact(x, y, scene) {
    if (!scene) return;
    
    const flashGeo = new THREE.CircleGeometry(8, 16);
    const flashMat = new THREE.MeshBasicMaterial({
        color: 0xff3366,
        transparent: true,
        opacity: 1.0
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.set(x, y, 1);
    scene.add(flash);
    
    // Fade out
    setTimeout(() => {
        scene.remove(flash);
        flashGeo.dispose();
        flashMat.dispose();
    }, 100);
}

/**
 * Handle laser collision with brick
 */
export function hitBrickWithLaser(paddleLeft, paddleRight, beamHeight, scene) {
    // Type safety check for bricks.items
    if (!Array.isArray(bricks.items)) return;
    
    // Check bricks along laser paths
    for (const brick of bricks.items) {
        if (brick.hp <= 0 || brick.isIndestructible) continue;
        
        const brickLeft = brick.x - brick.width / 2;
        const brickRight = brick.x + brick.width / 2;
        const brickTop = brick.y + brick.height / 2;
        
        // Check if brick is in path of either laser beam
        const inLeftBeam = paddleLeft >= brickLeft && paddleLeft <= brickRight && brickTop <= beamHeight;
        const inRightBeam = paddleRight >= brickLeft && paddleRight <= brickRight && brickTop <= beamHeight;
        
        if (inLeftBeam || inRightBeam) {
            // Create impact flash
            if (scene) {
                createLaserImpact(brick.x, brick.y, scene);
            }
            
            // Instant destroy weak bricks (HP <= 1)
            if (brick.maxHp <= 1) {
                brick.hp = 0;
                brick.mesh.visible = false;
                gameState.bricksRemaining--;
                addScore(100, brick.x, brick.y);
                spawnParticles(brick.x, brick.y, 0xff0000, 15);
                playSound('break');
                
                // Check level complete
                if (gameState.bricksRemaining <= 0) {
                    levelComplete();
                }
            } else {
                // Damage stronger bricks
                brick.hp--;
                spawnParticles(brick.x, brick.y, 0xff6b9d, 8);
                playSound('hit');
                
                // Flash effect
                brick.mesh.material.color.setHex(0xffffff);
                setTimeout(() => {
                    if (brick.mesh) brick.mesh.material.color.setHex(0xff6b9d);
                }, 50);
            }
        }
    }
}
