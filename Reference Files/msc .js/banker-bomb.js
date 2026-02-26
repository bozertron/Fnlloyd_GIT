// ============================================
// BANKER BOMB SYSTEM (Priority 1.5)
// ============================================
import * as THREE from 'three';
import { CONSTANTS, PowerUpType } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { addScore, levelComplete } from './game-loop.js';
import { bricks } from './entity-systems.js';

let bankerMesh = null;
let bankerExplosionActive = false;

/**
 * Summon The Banker - ultimate screen-clearing weapon
 * Dramatic entrance with golden silhouette and particle halo
 */
export function summonTheBanker(powerUpSystem, scene, camera) {
    const bankerPowerUp = powerUpSystem.activePowerUps.find(
        p => p.type === PowerUpType.BANKER_BOMB
    );
    
    if (!bankerPowerUp || bankerExplosionActive) return;
    
    bankerExplosionActive = true;
    
    // Dramatic entrance: The Banker descends from top center
    const bankerGroup = new THREE.Group();
    
    // Golden silhouette body (iPod-like rounded rectangle)
    const bodyGeo = new THREE.CapsuleGeometry(8, 25, 4, 8);
    const bodyMat = new THREE.MeshBasicMaterial({
        color: 0xffd700, // Pure gold
        transparent: true,
        opacity: 0.9
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    bankerGroup.add(body);
    
    // Glowing aura ring
    const auraGeo = new THREE.TorusGeometry(12, 0.5, 8, 32);
    const auraMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.6
    });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.rotation.x = Math.PI / 2;
    aura.position.y = -15;
    bankerGroup.add(aura);
    
    // Particle halo around The Banker
    const haloParticles = [];
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 15;
        const particleGeo = new THREE.SphereGeometry(0.3, 4, 4);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.8
        });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        particle.position.set(
            Math.cos(angle) * radius,
            10 + Math.sin(angle) * 3,
            0
        );
        bankerGroup.add(particle);
        haloParticles.push({
            mesh: particle,
            angle: angle,
            speed: 0.02 + Math.random() * 0.02,
            radius: radius
        });
    }
    
    // Position at top center of screen
    bankerGroup.position.set(0, CONSTANTS.GAME_HEIGHT / 2 - 50, 0);
    scene.add(bankerGroup);
    
    bankerMesh = {
        group: bankerGroup,
        haloParticles: haloParticles,
        phase: 'descending',
        targetY: 0,
        descentSpeed: 0.8,
        hoverOffset: 0,
        hoverSpeed: 0.05,
        time: 0
    };
    
    // Play dramatic summon sound
    playSound('banker_summon');
    
    // Screen flash on appearance
    if (camera) {
        camera.position.z = 15;
        setTimeout(() => {
            if (camera) camera.position.z = 10;
        }, 300);
    }
    
    // After 2 second dramatic pause, trigger explosion
    setTimeout(() => {
        triggerBankerExplosion(scene, camera);
    }, 2000);
}

/**
 * Update The Banker animation (descent + hover)
 */
export function updateTheBanker(deltaTime) {
    if (!bankerMesh) return;
    
    const banker = bankerMesh;
    banker.time += deltaTime;
    
    // Animate halo particles
    banker.haloParticles.forEach(p => {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.radius;
        p.mesh.position.z = Math.sin(p.angle) * p.radius;
    });
    
    // Descent animation
    if (banker.phase === 'descending') {
        if (banker.group.position.y > banker.targetY) {
            banker.group.position.y -= banker.descentSpeed;
        } else {
            banker.phase = 'hovering';
        }
    }
    
    // Hover animation with sine wave
    if (banker.phase === 'hovering') {
        banker.hoverOffset = Math.sin(banker.time * banker.hoverSpeed * 60) * 3;
        banker.group.position.y = banker.targetY + banker.hoverOffset;
        
        // Subtle rotation
        banker.group.rotation.z = Math.sin(banker.time * 0.5) * 0.1;
        banker.group.rotation.y = Math.sin(banker.time * 0.3) * 0.15;
    }
}

/**
 * Trigger massive golden explosion that clears 1/5 of screen
 */
export function triggerBankerExplosion(scene, camera) {
    if (!bankerMesh) return;
    
    // Massive golden explosion that clears 1/5 of screen
    const explosionX = bankerMesh.group.position.x;
    const explosionY = bankerMesh.group.position.y;
    const explosionRadius = CONSTANTS.GAME_WIDTH / 5; // 1/5 of screen width (~160 units)
    
    // Remove The Banker
    scene.remove(bankerMesh.group);
    bankerMesh.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
    });
    bankerMesh = null;
    
    // Create massive explosion visual
    const explosionGeo = new THREE.SphereGeometry(explosionRadius, 32, 32);
    const explosionMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.8
    });
    const explosion = new THREE.Mesh(explosionGeo, explosionMat);
    explosion.position.set(explosionX, explosionY, 0);
    scene.add(explosion);
    
    // Expand animation
    let scale = 0.1;
    const expandInterval = setInterval(() => {
        scale += 0.15;
        explosion.scale.set(scale, scale, scale);
        explosion.material.opacity = 0.8 - (scale * 0.4);
        
        if (scale >= 2.0) {
            clearInterval(expandInterval);
            scene.remove(explosion);
            explosionGeo.dispose();
            explosionMat.dispose();
        }
    }, 50);
    
    // Spawn massive particle explosion
    spawnParticles(explosionX, explosionY, 0xffd700, 100);
    
    // Play epic explosion sound
    playSound('banker_explosion');
    
    // Massive screen shake
    camera.position.x += (Math.random() - 0.5) * 2;
    camera.position.y += (Math.random() - 0.5) * 2;
    setTimeout(() => {
        camera.position.set(0, 0, 10);
    }, 500);
    
    // Destroy ALL bricks in radius (instant clear)
    destroyBricksInRadius(explosionX, explosionY, explosionRadius, scene);
}

/**
 * Destroy all bricks within explosion radius
 * Instant destruction regardless of HP
 */
export function destroyBricksInRadius(centerX, centerY, radius, scene) {
    let destroyedCount = 0;
    
    for (const brick of bricks.items) {
        if (brick.hp <= 0 || brick.isIndestructible) continue;
        
        const dx = brick.x - centerX;
        const dy = brick.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Check if brick is within explosion radius
        if (dist <= radius) {
            // Instant destroy regardless of HP
            brick.hp = 0;
            brick.mesh.visible = false;
            gameState.bricksRemaining--;
            
            // Bonus score for Banker kills
            addScore(50, brick.x, brick.y);
            
            // Golden explosion particles
            spawnParticles(brick.x, brick.y, 0xffd700, 8);
            destroyedCount++;
        }
    }
    
    playSound('banker_clear');
    
    // Check level complete
    if (gameState.bricksRemaining <= 0) {
        levelComplete();
    }
    
    console.log(`The Banker cleared ${destroyedCount} bricks!`);
}

/**
 * Cleanup Banker resources
 */
export function cleanupBanker(scene) {
    // Cleanup on life lost or power-up expire
    if (bankerMesh) {
        scene.remove(bankerMesh.group);
        bankerMesh.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        bankerMesh = null;
    }
    bankerExplosionActive = false;
}

/**
 * Check if Banker Bomb is currently active
 */
export function isBankerActive() {
    return bankerMesh !== null;
}
