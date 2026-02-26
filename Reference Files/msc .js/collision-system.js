// ============================================
// COLLISION SYSTEM - Ball vs Brick Physics
// ============================================
import { CONSTANTS, BALL_CONFIGS, PowerUpType } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { paddle, ballManager, bricks } from './entity-systems.js';
import { powerUpSystem } from './powerup-manager.js';
import { triggerScreenShake } from './game-loop.js';
import { addScore, levelComplete } from './game-loop.js';
import { checkSpecialCharacterSpawn } from './special-characters.js';
import { fnlloydOnEvent } from './fnlloyd-entity.js';

const BRICK_WIDTH = CONSTANTS.BRICK_WIDTH;
const BRICK_HEIGHT = CONSTANTS.BRICK_HEIGHT;

/**
 * Check collision between ball and all bricks
 */
export function checkCollision(ball, bricks, scene) {
    const config = BALL_CONFIGS[ball.type];
    
    // Apply gravity well effect (Black Hole)
    if (config.gravityWell) {
        applyGravityWell(ball, bricks);
    }
    
    let collisionCount = 0;
    for (const brick of bricks.items) {
        if (brick.hp <= 0) continue;
        
        // Check phase-through abilities (Crystal, Ghost)
        if (config.phaseChance && !ball.isPhasing) {
            if (Math.random() < config.phaseChance) {
                ball.isPhasing = true;
                setTimeout(() => { ball.isPhasing = false; }, 200);
                continue; // Skip collision this frame
            }
        }
        
        // Circle-rect collision detection
        const closestX = Math.max(brick.x - brick.width / 2, Math.min(ball.x, brick.x + brick.width / 2));
        const closestY = Math.max(brick.y - brick.height / 2, Math.min(ball.y, brick.y + brick.height / 2));
        
        const distX = ball.x - closestX;
        const distY = ball.y - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        if (distance < ball.radius) {
            // Calculate overlap for debug logging
            const overlapX = (ball.x - brick.x) / (BRICK_WIDTH / 2);
            const overlapY = (ball.y - brick.y) / (BRICK_HEIGHT / 2);
            
            // Add collision debug logging (temporary, can remove later)
            if (process.env.NODE_ENV === 'development') {
                console.log(`COLLISION DETECTED: Ball at (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}) hit brick at (${brick.x.toFixed(1)}, ${brick.y.toFixed(1)})`);
                console.log(`Overlap: X=${overlapX.toFixed(2)}, Y=${overlapY.toFixed(2)}`);
            }
            
            // Check for Shield power-up - blocks one brick collision
            const shieldActive = paddle.shieldMesh !== null;
            
            if (shieldActive) {
                // Shield absorbs the impact!
                playSound('shield_hit');
                spawnParticles(ball.x, ball.y, 0x00ffff, 20);
                
                // Remove shield
                paddle.removeShield();
                
                // Bounce ball normally (use overlapX and overlapY from above)
                if (Math.abs(overlapX) > Math.abs(overlapY)) {
                    ball.vx *= -1 * ball.bounceModifier;
                } else {
                    ball.vy *= -1 * ball.bounceModifier;
                }
                
                // Don't damage brick - shield protected it!
                // Continue checking other bricks instead of returning early
                continue;
            }
            
            // Determine collision side with improved logic (already calculated above)
            // overlapX and overlapY already available from earlier calculation

            // Determine which face was hit based on ball approach direction
            const approachingFromLeft = ball.vx > 0 && ball.x < brick.x;
            const approachingFromRight = ball.vx < 0 && ball.x > brick.x;
            const approachingFromTop = ball.vy > 0 && ball.y < brick.y;
            const approachingFromBottom = ball.vy < 0 && ball.y > brick.y;

            if (Math.abs(overlapX) > Math.abs(overlapY)) {
                // Side hit
                ball.vx *= -1 * ball.bounceModifier;
                
                // Slide along surface slightly (friction)
                ball.vy *= 0.95;
            } else {
                // Top/bottom hit
                ball.vy *= -1 * ball.bounceModifier;
                
                // Horizontal friction
                ball.vx *= 0.95;
            }
            
            // Damage brick
            brick.hp--;
            
            // Handle Split Ball - creates 3 balls on impact
            if (config.splitOnImpact && !ball.hasSplit) {
                ball.hasSplit = true;
                createSplitBalls(ball, bricks, scene);
            }
            
            if (brick.isIndestructible) {
                playSound('metal');
                spawnParticles(brick.x, brick.y, 0x888888, 5);
            } else if (brick.hp <= 0) {
                // Destroyed!
                const points = brick.maxHp > 1 ? brick.maxHp * 100 : 100;
                addScore(points, brick.x, brick.y);
                gameState.combo++;
                gameState.lastHitTime = Date.now();
                
                // Color based on type
                const color = brick.type === 2 ? 0xff6b9d : 0xffd700;
                spawnParticles(brick.x, brick.y, color, 20);
                
                brick.mesh.visible = false;
                gameState.bricksRemaining--;
                
                playSound('break');
                triggerScreenShake();
                
                // Check for power-up drop
                powerUpSystem.checkDrop(brick, scene);
                
                // Check for special character spawn (1% Politician, 5% Banker)
                checkSpecialCharacterSpawn(brick, scene);
                
                // Notify Fnlloyd of brick destruction
                fnlloydOnEvent('brickDestroyed', { combo: gameState.combo });
                
                // Check level complete
                if (gameState.bricksRemaining <= 0) {
                    fnlloydOnEvent('lastBrickDestroyed');
                    levelComplete();
                }
            } else {
                // Multi-hit brick damaged
                playSound('hit');
                spawnParticles(brick.x, brick.y, 0xff6b9d, 8);
                
                // Flash effect
                brick.mesh.material.color.setHex(0xffffff);
                setTimeout(() => {
                    if (brick.mesh) brick.mesh.material.color.setHex(0xff6b9d);
                }, 50);
            }
            
            return true;
        }
    }
    return false;
}

/**
 * Create 3 split balls when Split Ball hits brick
 */
function createSplitBalls(originalBall, bricks, scene) {
    const config = BALL_CONFIGS[originalBall.type];
    
    // Create 2 additional balls
    for (let i = 0; i < config.splitCount - 1; i++) {
        const newBall = ballManager.create(
            originalBall.type,
            originalBall.x,
            originalBall.y,
            originalBall.vx * (0.5 + Math.random() * 0.5) * (i % 2 === 0 ? 1 : -1),
            originalBall.vy * (0.5 + Math.random() * 0.5),
            scene
        );
        newBall.boomerangBounces = originalBall.boomerangBounces;
        ballManager.balls.push(newBall);
        gameState.activeBalls.push(newBall);
    }
    
    // Mark original as split
    originalBall.hasSplit = true;
}

/**
 * Apply gravity well effect to nearby bricks (Black Hole ball)
 */
function applyGravityWell(ball, bricks) {
    const config = BALL_CONFIGS[ball.type];
    
    for (const brick of bricks.items) {
        if (brick.hp <= 0) continue;
        
        const dx = ball.x - brick.x;
        const dy = ball.y - brick.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < config.pullRadius) {
            // Pull brick toward ball
            const force = config.pullStrength / (distance + 1);
            brick.x += (dx / distance) * force * 0.01;
            brick.y += (dy / distance) * force * 0.01;
            
            if (brick.mesh) {
                brick.mesh.position.x = brick.x;
                brick.mesh.position.y = brick.y;
            }
        }
    }
}
