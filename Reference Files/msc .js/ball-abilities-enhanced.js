import * as THREE from 'three';
import { CONSTANTS, BALL_CONFIGS, BallType } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { triggerAutoWin } from './game-loop.js';

/**
 * Enhanced Ball Abilities System
 * Handles special mechanics for all 9+ ball types
 */
export const ballAbilities = {
    
    /**
     * Apply enhanced gravity well that affects BOTH bricks AND other balls
     */
    applyEnhancedGravityWell(ball, bricks, otherBalls, dt) {
        const config = BALL_CONFIGS[ball.type];
        
        if (!config.gravityWell) return;
        
        // Affect bricks
        bricks.items.forEach(brick => {
            if (brick.hp <= 0) return;
            
            const dx = ball.x - brick.x;
            const dy = ball.y - brick.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < config.pullRadius) {
                const force = config.pullStrength / (distance + 1);
                brick.x += (dx / distance) * force * 0.016; // Move toward black hole
                if (brick.mesh) {
                    brick.mesh.position.set(brick.x, brick.y, 0);
                }
            }
        });
        
        // Affect other balls (chaos!)
        otherBalls.forEach(other => {
            if (other === ball) return;
            
            const dx = ball.x - other.x;
            const dy = ball.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < config.pullRadius * 1.5) {
                const force = config.pullStrength * 0.5 / (distance + 1);
                other.vx += (dx / distance) * force * 0.1;
                other.vy += (dy / distance) * force * 0.1;
            }
        });
    },
    
    /**
     * Handle Inflatable Ball growth/risk mechanic
     */
    handleInflatableGrowth(ball, hitPaddle, scene) {
        if (ball.type !== BallType.INFLATABLE) return;
        
        const config = BALL_CONFIGS[ball.type];
        
        // Grow on each paddle hit
        if (hitPaddle) {
            ball.growthMultiplier *= 1.2;
            ball.radius = config.radius * ball.growthMultiplier;
            
            // Visual scaling
            if (ball.mesh) {
                ball.mesh.scale.set(
                    ball.growthMultiplier,
                    ball.growthMultiplier,
                    ball.growthMultiplier
                );
            }
            
            // Check for auto-win or pop
            if (ball.growthMultiplier > 3.0) {
                const outcomeRand = Math.random();
                
                if (outcomeRand < 0.5) {
                    // AUTO-WIN! Ball fills screen
                    console.log('🎈 INFLATABLE BALL AUTO-WIN!');
                    if (typeof triggerAutoWin === 'function') {
                        triggerAutoWin(scene);
                    }
                } else {
                    // POP! Lose ball
                    console.log('💥 Inflatable ball popped!');
                    spawnParticles(ball.x, ball.y, config.color, 30);
                    playSound('pop');
                    ball.isLost = true;
                }
            }
            
            // Stretching sound
            playSound('rubber_stretch');
        }
    },
    
    /**
     * Handle Boomerang Ball special bouncing
     */
    handleBoomerangBounce(ball, paddle) {
        if (ball.type !== BallType.BOOMERANG) return;
        
        const config = BALL_CONFIGS[ball.type];
        
        // Check if ball hit inner corner (V-shape apex of boomerang paddle)
        if (paddle.currentMorph === 'boomerang') {
            const distFromCenter = Math.abs(ball.x - paddle.x);
            
            if (distFromCenter < 20) {
                // Hit the apex - extreme angle shot
                ball.vx *= 1.3;
                ball.vy *= -1.2;
                spawnParticles(ball.x, ball.y, 0x00fff7, 15);
                playSound('boomerang_hit');
            }
        }
        
        // Count bounces for maxBounces limit
        ball.boomerangBounces++;
        
        if (ball.boomerangBounces >= config.maxBounces) {
            // Ball becomes normal after max bounces
            ball.bounceModifier = 1.0;
        }
    },
    
    /**
     * Handle Disco Ball rainbow effects
     */
    handleDiscoEffects(ball) {
        if (ball.type !== BallType.DISCO) return;
        
        const config = BALL_CONFIGS[ball.type];
        
        // Rainbow color cycling
        if (ball.mesh) {
            const hue = (Date.now() / 100) % 360;
            ball.mesh.material.color.setHSL(hue / 360, 1, 0.5);
        }
        
        // Random disco particles
        if (Math.random() < 0.1) {
            const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            spawnParticles(ball.x, ball.y, randomColor, 2);
        }
    },
    
    /**
     * Handle Basketball Ball arc physics
     */
    handleBasketballArc(ball, dt) {
        if (ball.type !== BallType.BASKETBALL) return;
        
        // Add slight parabolic arc to movement
        const gravity = 0.001;
        ball.vy -= gravity * dt * 1000;
        
        // Occasional bounce sound variation
        if (Math.abs(ball.vy) < 100 && Math.random() < 0.2) {
            playSound('basketball_hit');
        }
    },
    
    /**
     * Handle Crystal Ball phasing
     */
    handleCrystalPhasing(ball) {
        if (ball.type !== BallType.CRYSTAL) return;
        
        const config = BALL_CONFIGS[ball.type];
        
        // Visual transparency when phasing
        if (ball.isPhasing && ball.mesh) {
            ball.mesh.material.opacity = 0.3;
            ball.mesh.material.transparent = true;
        } else if (ball.mesh) {
            ball.mesh.material.opacity = 1.0;
        }
        
        // Crystal whisper sounds
        if (Math.random() < 0.05) {
            playSound('ghost_whisper');
        }
    },
    
    /**
     * Handle Ghost Ball probability-based behavior
     */
    handleGhostProbability(ball) {
        if (ball.type !== BallType.GHOST) return;
        
        const config = BALL_CONFIGS[ball.type];
        
        // Random chance to phase through obstacles
        if (Math.random() < config.phaseChance) {
            ball.isPhasing = true;
            setTimeout(() => { ball.isPhasing = false; }, 200);
        }
        
        // Ethereal trail
        if (Math.random() < 0.2) {
            spawnParticles(ball.x, ball.y, 0xaaaaaa, 1);
        }
    },
    
    /**
     * Handle Split Ball multiplication
     */
    handleSplitBehavior(ball, bricks, scene) {
        if (ball.type !== BallType.SPLIT) return;
        
        const config = BALL_CONFIGS[ball.type];
        
        // Already split logic is in collision-system.js
        // This adds visual feedback
        if (ball.hasSplit && Math.random() < 0.3) {
            spawnParticles(ball.x, ball.y, 0x00ff00, 1);
        }
    },
    
    /**
     * Update all active ball abilities
     */
    updateAllAbilities(balls, bricks, paddle, scene, dt) {
        balls.forEach(ball => {
            // Enhanced gravity well (Black Hole)
            this.applyEnhancedGravityWell(ball, bricks, balls, dt);
            
            // Inflatable growth
            this.handleInflatableGrowth(ball, false, scene);
            
            // Disco effects
            this.handleDiscoEffects(ball);
            
            // Basketball arc
            this.handleBasketballArc(ball, dt);
            
            // Crystal phasing
            this.handleCrystalPhasing(ball);
            
            // Ghost probability
            this.handleGhostProbability(ball);
            
            // Split behavior
            this.handleSplitBehavior(ball, bricks, scene);
        });
    }
};
