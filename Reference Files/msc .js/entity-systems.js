// ============================================
// ENTITY SYSTEMS - Paddle, Ball Manager, Bricks
// ============================================
import * as THREE from 'three';
import { CONSTANTS, BallType, BALL_CONFIGS, PowerUpType, POWERUP_CONFIGS } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { powerUpSystem } from './powerup-manager.js';
import { paddleMorphSystem } from './paddle-morphs.js';
import { triggerScreenShake } from './game-loop.js';
import { fnlloydOnEvent } from './fnlloyd-entity.js';

/**
 * Paddle Entity with all upgrade mechanics
 */
export const paddle = {
    x: 0,
    y: -CONSTANTS.GAME_HEIGHT / 2 + 50,
    width: CONSTANTS.PADDLE_WIDTH,
    height: CONSTANTS.PADDLE_HEIGHT,
    previousX: 0,  // Track previous X position for velocity influence
    mesh: null,
    caughtBall: null,
    magneticFieldMesh: null,
    shieldMesh: null,
    stickyActive: false,
    stickyCatchesRemaining: 0,
    stickyEndTime: null,
    stickyMesh: null,
    currentMorph: 'standard',
    isInvincible: false,
    
    init(scene) {
        const geo = new THREE.BoxGeometry(this.width, this.height, 10);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00fff7 });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(this.x, this.y, 0);
        scene.add(this.mesh);
        
        // Neon glow
        const glowGeo = new THREE.BoxGeometry(this.width + 10, this.height + 10, 5);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0x00fff7, 
            transparent: true, 
            opacity: 0.3 
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.z = -3;
        this.mesh.add(glow);
        
        // Initialize paddle morph system
        paddleMorphSystem.init(scene, this);
    },
    
    // Create Magnetic Edge field visual
    createMagneticField() {
        if (this.magneticFieldMesh) return;
        
        // Blue aura around paddle edges
        const fieldGeo = new THREE.RingGeometry(
            this.width / 2 + 20,
            this.width / 2 + 25,
            32,
            1,
            0,
            Math.PI
        );
        const fieldMat = new THREE.MeshBasicMaterial({
            color: 0x0066ff,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        this.magneticFieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
        this.magneticFieldMesh.rotation.x = Math.PI / 2;
        this.magneticFieldMesh.position.y = -this.height / 2;
        this.mesh.add(this.magneticFieldMesh);
    },
    
    // Remove Magnetic Edge field
    removeMagneticField() {
        if (this.magneticFieldMesh) {
            this.mesh.remove(this.magneticFieldMesh);
            this.magneticFieldMesh.geometry.dispose();
            this.magneticFieldMesh.material.dispose();
            this.magneticFieldMesh = null;
        }
    },
    
    // Create Shield barrier
    createShield() {
        if (this.shieldMesh) return;
        
        // Transparent dome over paddle
        const shieldGeo = new THREE.SphereGeometry(
            this.width / 2 + 10, 
            32, 16, 
            0, Math.PI * 2, 
            0, Math.PI / 2
        );
        const shieldMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.4
        });
        this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        this.shieldMesh.position.set(0, 0, 0);
        this.mesh.add(this.shieldMesh);
    },
    
    // Remove Shield barrier
    removeShield() {
        if (this.shieldMesh) {
            this.mesh.remove(this.shieldMesh);
            this.shieldMesh.geometry.dispose();
            this.shieldMesh.material.dispose();
            this.shieldMesh = null;
        }
    },
    
    activateSticky() {
        this.stickyActive = true;
        this.stickyCatchesRemaining = 3;
        this.stickyEndTime = Date.now() + 30000;
        
        if (!this.stickyMesh) {
            const geo = new THREE.BoxGeometry(this.width, 5, 3);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x8b4513,
                transparent: true,
                opacity: 0.7
            });
            this.stickyMesh = new THREE.Mesh(geo, mat);
            this.stickyMesh.position.y = this.height / 2 + 2;
            this.mesh.add(this.stickyMesh);
        }
    },
    
    deactivateSticky() {
        this.stickyActive = false;
        this.caughtBall = null;
        
        if (this.stickyMesh) {
            this.mesh.remove(this.stickyMesh);
            this.stickyMesh.geometry.dispose();
            this.stickyMesh.material.dispose();
            this.stickyMesh = null;
        }
    },
    
    catchBall(ball) {
        if (!this.stickyActive || this.stickyCatchesRemaining <= 0) return false;
        
        this.caughtBall = ball;
        ball.isCaught = true;
        ball.vx = 0;
        ball.vy = 0;
        this.stickyCatchesRemaining--;
        
        if (this.stickyCatchesRemaining <= 0) {
            this.deactivateSticky();
        }
        return true;
    },
    
    launchCaughtBall() {
        if (!this.caughtBall) return;
        
        const ball = this.caughtBall;
        ball.isCaught = false;
        
        const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        ball.vx = Math.cos(angle) * ball.speed;
        ball.vy = Math.abs(Math.sin(angle) * ball.speed);
        
        this.caughtBall = null;
        
        if (this.stickyCatchesRemaining <= 0) {
            this.deactivateSticky();
        }
    },
    
    update(dt, mouseX, scene) {
        // Smooth movement toward mouse (CORE-01: sub-16ms response)
        const targetX = Math.max(
            -CONSTANTS.GAME_WIDTH / 2 + this.width / 2,
            Math.min(CONSTANTS.GAME_WIDTH / 2 - this.width / 2, mouseX)
        );
        this.previousX = this.x;  // Store previous position for velocity tracking
        this.x += (targetX - this.x) * 0.3;
        this.mesh.position.x = this.x;
        
        // Handle Politician morph random behavior
        if (this.currentMorph === 'politician' && paddleMorphSystem.morphs.politician.randomBehavior) {
            if (Math.random() < 0.01) { // 1% chance per frame
                paddleMorphSystem.morphs.politician.randomBehavior(this);
            }
        }
    },
    
    reset() {
        this.x = 0;
        this.mesh.position.x = 0;
    }
};

/**
 * Ball Manager - Handles all 12 ball types
 */
export const ballManager = {
    balls: [],
    
    // Create a ball of specified type
    create(type = BallType.TENNIS, x = 0, y = 0, vx = 0, vy = 0, scene) {
        const config = BALL_CONFIGS[type];
        
        const ball = {
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            radius: config.radius,
            speed: config.speed,
            bounceModifier: config.bounceModifier,
            mesh: null,
            trailParticles: [],
            boomerangBounces: 0,
            growthMultiplier: 1.0,
            isCaught: false,
            attachGlow: null,
            
            init(scene) {
                // Create geometry based on type
                let geo;
                if (type === BallType.DISCO) {
                    // Disco ball has faceted geometry
                    geo = new THREE.IcosahedronGeometry(this.radius, 1);
                } else {
                    geo = new THREE.CircleGeometry(this.radius, 16);
                }
                
                // Material based on type
                const matConfig = { color: config.color };
                if (config.transparent) {
                    matConfig.transparent = true;
                    matConfig.opacity = config.opacity || 1.0;
                }
                
                const mat = new THREE.MeshBasicMaterial(matConfig);
                this.mesh = new THREE.Mesh(geo, mat);
                this.mesh.position.set(this.x, this.y, 0);
                scene.add(this.mesh);
                
                // Add glow for special balls
                if (type === BallType.BLACK_HOLE) {
                    const glowGeo = new THREE.RingGeometry(
                        this.radius * 1.2, 
                        this.radius * 1.5, 
                        32
                    );
                    const glowMat = new THREE.MeshBasicMaterial({
                        color: config.trailColor,
                        transparent: true,
                        opacity: 0.5,
                        side: THREE.DoubleSide
                    });
                    const glow = new THREE.Mesh(glowGeo, glowMat);
                    glow.position.z = -2;
                    this.mesh.add(glow);
                }
                
                // Initialize trail array
                this.trailSegments = [];
                this.maxTrailSegments = config.trailSegments || 10;
                
                // Create trail segment pool
                for (let i = 0; i < this.maxTrailSegments; i++) {
                    const trailGeo = new THREE.CircleGeometry(this.radius * 0.6, 8);
                    const trailMat = new THREE.MeshBasicMaterial({
                        color: config.trailColor,
                        transparent: true,
                        opacity: 0
                    });
                    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
                    trailMesh.position.z = -1; // Behind ball
                    scene.add(trailMesh);
                    
                    this.trailSegments.push({
                        mesh: trailMesh,
                        x: this.x,
                        y: this.y,
                        age: 0,
                        maxAge: 0.3 // seconds
                    });
                }
            },
            
            launch() {
                if (!gameState.ballLaunched) {
                    gameState.ballLaunched = true;
                    // Launch upward (positive Y in Three.js coordinates)
                    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                    this.vx = Math.cos(angle) * this.speed;
                    this.vy = Math.abs(Math.sin(angle) * this.speed); // Force positive for upward movement
                }
            },
            
            update(dt, paddle, scene, triggerAutoWin, checkLifeLost) {
                const config = BALL_CONFIGS[this.type];
                
                if (this.isCaught) {
                    this.x = paddle.x;
                    this.y = paddle.y + paddle.height / 2 + this.radius + 5;
                    this.mesh.position.set(this.x, this.y, 0);
                    return;
                }
                
                // Stick to paddle if not launched
                if (!gameState.ballLaunched) {
                    this.x = paddle.x;
                    this.y = paddle.y + this.radius + 5;
                    this.mesh.position.set(this.x, this.y, 0);
                    return;
                }
                
                // Apply gravity well effects (Black Hole)
                if (config.gravityWell) {
                    gameState.activeGravityWells.push({
                        x: this.x,
                        y: this.y,
                        strength: config.pullStrength,
                        radius: config.pullRadius
                    });
                }
                
                // Move ball
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                
                // Wall collisions
                if (this.x <= -CONSTANTS.GAME_WIDTH / 2 + this.radius) {
                    this.x = -CONSTANTS.GAME_WIDTH / 2 + this.radius;
                    this.vx *= -1 * this.bounceModifier;
                    playSound('wall');
                    
                    // Enhanced particle effect - spawn along wall surface
                    const particleCount = Math.floor(Math.abs(this.vy) / 100) + 3;
                    spawnParticles(this.x, this.y, config.trailColor, particleCount);
                    
                    // Screen shake on high-speed impact
                    if (Math.abs(this.vx) > 600) {
                        triggerScreenShake();
                    }
                }
                if (this.x >= CONSTANTS.GAME_WIDTH / 2 - this.radius) {
                    this.x = CONSTANTS.GAME_WIDTH / 2 - this.radius;
                    this.vx *= -1 * this.bounceModifier;
                    playSound('wall');
                    
                    // Enhanced particle effect - spawn along wall surface
                    const particleCount = Math.floor(Math.abs(this.vy) / 100) + 3;
                    spawnParticles(this.x, this.y, config.trailColor, particleCount);
                    
                    // Screen shake on high-speed impact
                    if (Math.abs(this.vx) > 600) {
                        triggerScreenShake();
                    }
                }
                
                // Ceiling collision
                if (this.y >= CONSTANTS.GAME_HEIGHT / 2 - this.radius) {
                    this.y = CONSTANTS.GAME_HEIGHT / 2 - this.radius;
                    this.vy *= -1 * this.bounceModifier;
                    playSound('wall');
                    
                    // Enhanced particle effect - spawn along ceiling surface
                    const particleCount = Math.floor(Math.abs(this.vx) / 100) + 3;
                    spawnParticles(this.x, this.y, config.trailColor, particleCount);
                    
                    // Screen shake on high-speed impact
                    if (Math.abs(this.vy) > 600) {
                        triggerScreenShake();
                    }
                }
                
                // Paddle collision (CORE-03: deterministic bounce angles)
                // FIX: vy < 0 means ball is falling DOWNWARD toward paddle (not vy > 0 which is moving up)
                if (this.vy < 0 && !paddle.caughtBall) {
                    const paddleTop = paddle.y + paddle.height / 2;
                    const paddleBottom = paddle.y - paddle.height / 2;
                    const paddleLeft = paddle.x - paddle.width / 2;
                    const paddleRight = paddle.x + paddle.width / 2;
                    
                    if (this.y - this.radius <= paddleTop && 
                        this.y + this.radius >= paddleBottom &&
                        this.x + this.radius >= paddleLeft &&
                        this.x - this.radius <= paddleRight) {
                        
                        if (paddle.stickyActive && paddle.stickyCatchesRemaining > 0) {
                            paddle.catchBall(this);
                            playSound('powerup');
                            spawnParticles(this.x, paddleTop, 0x8b4513, 15);
                            return;
                        }
                        
                        const hitPosition = (this.x - paddle.x) / (paddle.width / 2);
                        const clampedHitPos = Math.max(-1, Math.min(1, hitPosition));
                        
                        const minAngle = 15 * Math.PI / 180;
                        const maxAngle = 75 * Math.PI / 180;
                        const bounceAngle = clampedHitPos * maxAngle;
                        
                        const clampedAngle = Math.sign(bounceAngle) * Math.max(Math.abs(bounceAngle), minAngle);
                        
                        this.vx = Math.sin(clampedAngle) * this.speed;
                        this.vy = -Math.abs(Math.cos(clampedAngle) * this.speed);
                        
                        // Add paddle velocity influence on bounce angle (advanced)
                        const paddleVelocityX = paddle.x - paddle.previousX;
                        const velocityInfluence = Math.min(Math.max(paddleVelocityX * 0.1, -0.3), 0.3);
                        this.vx += velocityInfluence * this.speed;

                        // Ensure minimum upward velocity after bounce (prevents phase-through)
                        if (this.vy > -100) {
                            this.vy = -Math.abs(this.vy) * 1.1; // Force upward with speed boost
                        }
                        
                        this.y = paddleTop + this.radius;
                        
                        gameState.combo = 0;
                        
                        playSound('paddle');
                        spawnParticles(this.x, paddleTop, 0x00fff7, 10);
                        
                        // Notify Fnlloyd of ball hitting paddle
                        fnlloydOnEvent('ballHitPaddle');
                    }
                }
                
                // Bottom boundary (life lost)
                if (this.y <= -CONSTANTS.GAME_HEIGHT / 2 - this.radius) {
                    const ballConfig = BALL_CONFIGS[this.type];
                    
                    if (ballConfig.returnsUpward && this.boomerangBounces < ballConfig.maxBounces) {
                        this.vy = Math.abs(this.vy);
                        this.boomerangBounces++;
                        playSound('boomerang');
                    } else if (paddle.shieldMesh) {
                        this.vy = Math.abs(this.vy);
                        this.y = -CONSTANTS.GAME_HEIGHT / 2 + this.radius + 10;
                        paddle.removeShield();
                        const shieldPowerUp = powerUpSystem.activePowerUps.find(p => p.type === PowerUpType.SHIELD);
                        if (shieldPowerUp) {
                            const idx = powerUpSystem.activePowerUps.indexOf(shieldPowerUp);
                            powerUpSystem.deactivate(idx, paddle, null, null, scene);
                        }
                        playSound('shield');
                        spawnParticles(this.x, this.y, 0x00ffff, 15);
                    } else {
                        this.isLost = true;
                        if (typeof checkLifeLost === 'function') {
                            checkLifeLost(scene);
                        }
                    }
                    return;
                }
                
                // Update mesh position
                if (this.mesh) {
                    this.mesh.position.set(this.x, this.y, 0);
                    
                    // Rainbow trail for Disco ball
                    if (config.rainbowTrail) {
                        const hue = (Date.now() / 100) % 360;
                        this.mesh.material.color.setHSL(hue / 360, 1, 0.5);
                    }
                }
                
                // Spawn trail particles
                if (Math.random() < 0.3) {
                    spawnParticles(this.x, this.y, config.trailColor, 1);
                }
                
                // Update trail
                const lastSegment = this.trailSegments[this.trailSegments.length - 1];
                if (lastSegment && lastSegment.age >= lastSegment.maxAge) {
                    // Recycle oldest segment to current position
                    const oldestSegment = this.trailSegments.shift();
                    oldestSegment.x = this.x;
                    oldestSegment.y = this.y;
                    oldestSegment.age = 0;
                    oldestSegment.mesh.material.opacity = 0.8;
                    this.trailSegments.push(oldestSegment);
                }

                // Age all segments
                this.trailSegments.forEach(segment => {
                    segment.age += dt;
                    segment.mesh.position.set(segment.x, segment.y, -1);
                    
                    // Fade out
                    const opacityProgress = segment.age / segment.maxAge;
                    segment.mesh.material.opacity = 0.8 * (1 - opacityProgress);
                    
                    // Shrink
                    const scale = 1 - opacityProgress * 0.5;
                    segment.mesh.scale.set(scale, scale, scale);
                    
                    // Remove if too old
                    if (segment.age >= segment.maxAge) {
                        segment.mesh.material.opacity = 0;
                    }
                });
            },
            
            destroy(scene) {
                if (this.mesh) {
                    if (scene) {
                        scene.remove(this.mesh);
                    }
                    if (this.mesh.geometry) this.mesh.geometry.dispose();
                    if (this.mesh.material) this.mesh.material.dispose();
                }
                const idx = gameState.activeBalls.indexOf(this);
                if (idx > -1) gameState.activeBalls.splice(idx, 1);
            }
        };
        
        ball.init(scene);
        return ball;
    },
    
    // Launch all active balls
    launchAll() {
        this.balls.forEach(ball => ball.launch());
    },
    
    // Update all balls
    updateAll(dt, paddle, scene, triggerAutoWin, checkLifeLost) {
        this.balls.forEach(ball => ball.update(dt, paddle, scene, triggerAutoWin, checkLifeLost));
    },
    
    // Clear all balls
    clear(scene) {
        this.balls.forEach(ball => ball.destroy(scene));
        this.balls = [];
    },
    
    // Set current ball type and respawn
    // spawnPaddle: optional paddle object to spawn ball above; if omitted, spawns at (0,0) and update loop will correct position on first frame
    setType(type, scene, spawnPaddle) {
        gameState.currentBallType = type;
        this.clear(scene);
        const config = BALL_CONFIGS[type];
        const spawnX = spawnPaddle ? spawnPaddle.x : 0;
        const spawnY = spawnPaddle ? spawnPaddle.y + config.radius + 5 : 0;
        const ball = this.create(type, spawnX, spawnY, 0, 0, scene);
        this.balls.push(ball);
        gameState.activeBalls = this.balls;
    },
    
    // Initialize with default ball
    init(scene) {
        this.setType(BallType.TENNIS, scene);
    },
    
    // Get all active balls
    getAllBalls() {
        return this.balls;
    }
};

/**
 * Brick System - Level loading and management
 */
export const bricks = {
    items: [],
    group: null,
    
    init(scene) {
        this.group = new THREE.Group();
        scene.add(this.group);
    },
    
    loadLevel(levelData, scene) {
        // Clear existing
        this.items = [];
        while(this.group.children.length > 0) { 
            const child = this.group.children[0];
            this.group.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
        
        // Load level from data structure: {rows, cols, data, colors, hp}
        const { rows, cols, data, colors, hp } = levelData;
        const startX = -((cols * (CONSTANTS.BRICK_WIDTH + CONSTANTS.BRICK_GAP)) / 2) + CONSTANTS.BRICK_WIDTH / 2;
        const startY = CONSTANTS.GAME_HEIGHT / 2 - 80;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const brickIdx = row * cols + col;
                const type = data[brickIdx];
                
                if (type === 0) continue;  // Empty cell
                
                const x = startX + col * (CONSTANTS.BRICK_WIDTH + CONSTANTS.BRICK_GAP);
                const y = startY - row * (CONSTANTS.BRICK_HEIGHT + CONSTANTS.BRICK_GAP);
                
                // Determine brick properties
                let color, brickHp, isIndestructible = false;
                
                if (type === 1) {  // Standard
                    color = colors[row % colors.length];
                    brickHp = hp || 1;
                } else if (type === 2) {  // Multi-hit
                    color = 0xff6b9d;
                    brickHp = 2;
                } else if (type === 3) {  // Indestructible
                    color = 0x444444;
                    brickHp = 999;
                    isIndestructible = true;
                }
                
                this.create(x, y, type, brickHp, isIndestructible, color, scene);
            }
        }
        
        gameState.bricksRemaining = this.items.filter(b => b.hp > 0 && !b.isIndestructible).length;
    },
    
    create(x, y, type, hp, isIndestructible, color, scene) {
        const geo = new THREE.BoxGeometry(CONSTANTS.BRICK_WIDTH, CONSTANTS.BRICK_HEIGHT, 5);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0);
        this.group.add(mesh);
        
        const brick = {
            x: x,
            y: y,
            width: CONSTANTS.BRICK_WIDTH,
            height: CONSTANTS.BRICK_HEIGHT,
            type: type,
            maxHp: hp,
            hp: hp,
            isIndestructible: isIndestructible,
            mesh: mesh,
            geometry: geo,
            material: mat,
            getColor() { return color; }
        };
        
        this.items.push(brick);
        return brick;
    },
    
    // Clear all bricks
    clear() {
        this.items.forEach(brick => {
            if (brick.mesh) {
                this.group.remove(brick.mesh);
                brick.geometry.dispose();
                brick.material.dispose();
            }
        });
        this.items = [];
    }
};
