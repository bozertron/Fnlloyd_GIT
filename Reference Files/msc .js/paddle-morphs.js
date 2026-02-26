import * as THREE from 'three';
import { CONSTANTS } from './constants.js';
import { gameState } from './state.js';
import { playSound } from './audio-placeholder.js';
import { spawnParticles } from './particle-system.js';

/**
 * Paddle Morph System
 * Manages paddle shape transformations with unique mechanics per form
 */
export const paddleMorphSystem = {
    currentMorph: 'standard',
    unlockedMorphs: ['standard'],
    morphCooldown: false,
    shimmerAnimationId: null,
    
    // Morph definitions with physics properties
    morphs: {
        standard: {
            name: 'Standard',
            width: 100,
            height: 15,
            geometry: 'box',
            bounceModifier: 1.0,
            description: 'Reliable rectangular paddle'
        },
        
        boomerang: {
            name: 'Boomerang',
            width: 120,
            height: 15,
            geometry: 'boomerang',
            bounceModifier: 1.1,
            specialAbility: 'Inner corner trick shots',
            unlockLevel: 3,
            
            // Custom collision logic
            customCollision: function(ball, paddle) {
                // Check if ball hit inner corner (V-shape apex)
                const distFromCenter = Math.abs(ball.x - paddle.x);
                
                if (distFromCenter < 20) {
                    // Hit the apex - extreme angle shot
                    ball.vx *= 1.3;
                    ball.vy *= -1.2;
                    spawnParticles(ball.x, ball.y, 0x00fff7, 15);
                    playSound('boomerang_hit');
                }
            }
        },
        
        tripleDecker: {
            name: 'Triple-Decker',
            segments: [
                { width: 30, gap: 15 },
                { width: 30, gap: 15 },
                { width: 30 }
            ],
            geometry: 'triple',
            bounceModifier: 1.0,
            specialAbility: 'Ball can pass through gaps intentionally',
            unlockLevel: 6,
            
            // Multiple hitboxes
            getHitboxes: function(paddleX, paddleY) {
                return [
                    { x: paddleX - 45, y: paddleY, width: 30, height: 15 },
                    { x: paddleX, y: paddleY, width: 30, height: 15 },
                    { x: paddleX + 45, y: paddleY, width: 30, height: 15 }
                ];
            }
        },
        
        concaveDish: {
            name: 'Concave Dish',
            width: 110,
            height: 15,
            geometry: 'concave',
            bounceModifier: 1.0,
            specialAbility: 'Catches ball, charge-up shot',
            unlockLevel: 9,
            
            // Special ability: catch and aim
            canCatch: true,
            chargeMultiplier: 2.5
        },
        
        politician: {
            name: 'The Politician',
            width: 80,
            height: 15,
            geometry: 'shimmering',
            bounceModifier: 0.8,
            specialAbility: 'Unpredictable size/position changes',
            isSpecial: true,
            dropRate: 0.01, // 1% chance
            
            // Random behavior
            randomBehavior: function(paddle) {
                const rand = Math.random();
                
                if (rand < 0.1) {
                    // 10% chance: invincible for 5 seconds
                    paddle.isInvincible = true;
                    setTimeout(() => { paddle.isInvincible = false; }, 5000);
                    spawnParticles(paddle.x, paddle.y, 0xffd700, 30);
                    playSound('politician_power');
                } else if (rand < 0.4) {
                    // 30% chance: ultra-wide moment (150px)
                    paddle.width = 150;
                    setTimeout(() => { paddle.width = 80; }, 2000);
                } else {
                    // 60% chance: shrinks temporarily
                    paddle.width = 20;
                    setTimeout(() => { paddle.width = 80; }, 1000);
                }
            }
        }
    },
    
    // Unlock a morph
    unlockMorph(morphName) {
        if (!this.unlockedMorphs.includes(morphName)) {
            this.unlockedMorphs.push(morphName);
            console.log(`🔓 Unlocked paddle morph: ${morphName}!`);
            
            // Visual feedback
            spawnParticles(0, -CONSTANTS.GAME_HEIGHT / 2 + 50, 0x00ff00, 50);
            playSound('unlock');
            
            // Save to persistence
            this.saveUnlocks();
        }
    },
    
    // Transform paddle to new morph
    transform(newMorph, scene, paddle) {
        if (this.morphCooldown) return;
        
        const oldMorph = this.currentMorph;
        this.currentMorph = newMorph;
        
        // Visual transformation effect
        spawnParticles(paddle.x, paddle.y, 0x00fff7, 30);
        playSound('paddle_morph');
        
        // Update paddle dimensions
        const morphConfig = this.morphs[newMorph];
        paddle.width = morphConfig.width;
        paddle.height = morphConfig.height;
        
        // Update paddle mesh geometry
        this.updatePaddleMesh(paddle, scene, morphConfig.geometry);
        
        // Log transformation
        console.log(`Paddle morphed: ${oldMorph} → ${newMorph}`);
        
        // Cooldown to prevent spam
        this.morphCooldown = true;
        setTimeout(() => { this.morphCooldown = false; }, 1000);
    },
    
    // Update paddle 3D mesh based on morph
    updatePaddleMesh(paddle, scene, geometryType) {
        // Remove old mesh
        if (paddle.mesh) {
            scene.remove(paddle.mesh);
            paddle.mesh.geometry.dispose();
            paddle.mesh.material.dispose();
        }
        
        let geo;
        
        switch(geometryType) {
            case 'box':
                geo = new THREE.BoxGeometry(paddle.width, paddle.height, 10);
                break;
                
            case 'boomerang':
                // V-shaped curve
                const shape = new THREE.Shape();
                const w = paddle.width / 2;
                const h = paddle.height;
                shape.moveTo(-w, -h/2);
                shape.lineTo(0, h); // Apex in center
                shape.lineTo(w, -h/2);
                shape.lineTo(w, -h/2 - 5);
                shape.lineTo(0, h + 5);
                shape.lineTo(-w, -h/2 - 5);
                shape.closePath();
                
                const extrudeSettings = { depth: 10, bevelEnabled: false };
                geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                break;
                
            case 'triple':
                // Three separate segments
                const group = new THREE.Group();
                
                [-1, 0, 1].forEach(i => {
                    const segGeo = new THREE.BoxGeometry(30, paddle.height, 10);
                    const segMat = new THREE.MeshBasicMaterial({ color: 0x00fff7 });
                    const segment = new THREE.Mesh(segGeo, segMat);
                    segment.position.x = i * 45;
                    group.add(segment);
                });
                
                paddle.mesh = group;
                paddle.mesh.position.set(paddle.x, paddle.y, 0);
                scene.add(paddle.mesh);
                return;
                
            case 'concave':
                // Satellite dish curve
                geo = new THREE.CylinderGeometry(
                    paddle.width / 2,
                    paddle.width / 2,
                    paddle.height,
                    16,
                    1,
                    true, // Open ended
                    0,
                    Math.PI
                );
                geo.rotateX(Math.PI / 2);
                break;
                
            case 'shimmering':
                // Iridescent, unstable form
                geo = new THREE.BoxGeometry(paddle.width, paddle.height, 10);
                const shimmerMat = new THREE.MeshBasicMaterial({
                    color: 0xff69b4,
                    transparent: true,
                    opacity: 0.7,
                    wireframe: true
                });
                paddle.mesh = new THREE.Mesh(geo, shimmerMat);
                paddle.mesh.position.set(paddle.x, paddle.y, 0);
                scene.add(paddle.mesh);
                
                // Animate shimmer
                const animateShimmer = () => {
                    if (paddle.mesh && this.currentMorph === 'politician') {
                        paddle.mesh.material.color.setHSL(
                            (Date.now() / 1000) % 1,
                            1,
                            0.5
                        );
                        this.shimmerAnimationId = requestAnimationFrame(animateShimmer);
                    } else {
                        this.shimmerAnimationId = null;
                    }
                };
                this.shimmerAnimationId = requestAnimationFrame(animateShimmer);
                return;
        }
        
        const mat = new THREE.MeshBasicMaterial({ color: 0x00fff7 });
        paddle.mesh = new THREE.Mesh(geo, mat);
        paddle.mesh.position.set(paddle.x, paddle.y, 0);
        scene.add(paddle.mesh);
    },
    
    // Check for morph unlocks on level complete
    checkLevelUnlocks(completedLevel) {
        Object.keys(this.morphs).forEach(morphName => {
            const morph = this.morphs[morphName];
            if (morph.unlockLevel && completedLevel >= morph.unlockLevel) {
                this.unlockMorph(morphName);
            }
        });
    },
    
    // Save/load unlocks (localStorage for now)
    saveUnlocks() {
        localStorage.setItem('fnlloyd_paddleMorphs', JSON.stringify(this.unlockedMorphs));
    },
    
    loadUnlocks() {
        const saved = localStorage.getItem('fnlloyd_paddleMorphs');
        if (saved) {
            this.unlockedMorphs = JSON.parse(saved);
        }
    },

    // Stop shimmer animation (cleanup)
    stopShimmerAnimation() {
        if (this.shimmerAnimationId) {
            cancelAnimationFrame(this.shimmerAnimationId);
            this.shimmerAnimationId = null;
        }
    },

    // Initialize system
    init(scene, paddle) {
        this.loadUnlocks();
        
        // Start with standard form
        this.updatePaddleMesh(paddle, scene, 'box');
    }
};
