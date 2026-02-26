import * as THREE from 'three';
import { CONSTANTS } from './constants.js';
import { gameState } from './state.js';
import { spawnParticles } from './particle-system.js';
import { playSound } from './audio-placeholder.js';
import { addScore } from './game-loop.js';

/**
 * The Politician - Risky benefactor
 */
export const thePolitician = {
    spawnChance: 0.01, // 1%
    mesh: null,
    active: false,
    
    spawn(brickPosition, scene) {
        console.log('🎩 The Politician appears!');
        
        // Create salesman model (simple geometric representation)
        const group = new THREE.Group();
        
        // Body (pinstripe suit)
        const bodyGeo = new THREE.CylinderGeometry(8, 10, 25, 8);
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0x2c2c2c });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);
        
        // Head
        const headGeo = new THREE.SphereGeometry(6, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 18;
        group.add(head);
        
        // Top hat
        const hatGeo = new THREE.CylinderGeometry(5, 5, 8, 8);
        const hatMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 25;
        group.add(hat);
        
        // Briefcase (power-up container)
        const briefcaseGeo = new THREE.BoxGeometry(10, 6, 3);
        const briefcaseMat = new THREE.MeshBasicMaterial({ color: 0x654321 });
        const briefcase = new THREE.Mesh(briefcaseGeo, briefcaseMat);
        briefcase.position.set(12, 5, 0);
        group.add(briefcase);
        
        group.position.set(brickPosition.x, brickPosition.y, 0);
        scene.add(group);
        
        this.mesh = group;
        this.active = true;
        
        // Dialogue bubble
        this.showDialogue("Trust me, this is definitely not a bribe!");
        
        // Offer power-up after 2 seconds
        setTimeout(() => {
            this.offerGift(scene);
        }, 2000);
    },
    
    showDialogue(text) {
        try {
            // Create HTML speech bubble
            const bubble = document.createElement('div');
            bubble.style.position = 'absolute';
            bubble.style.background = 'white';
            bubble.style.padding = '10px 20px';
            bubble.style.borderRadius = '20px';
            bubble.style.fontSize = '14px';
            bubble.style.pointerEvents = 'none';
            bubble.textContent = text;
            bubble.id = 'politician-bubble';
            document.body.appendChild(bubble);
            
            // Position above character
            setTimeout(() => {
                const bubbleEl = document.getElementById('politician-bubble');
                if (bubbleEl) {
                    bubbleEl.remove();
                }
            }, 3000);
        } catch (error) {
            console.error('Error showing dialogue:', error);
        }
    },
    
    offerGift(scene) {
        const rand = Math.random();
        
        if (rand < 0.99) {
            // 99% positive: Ultra-powerful temporary ability
            console.log('Politician gives powerful gift!');
            this.showDialogue("Feeling generous today!");
            
            // Grant legendary power-up
            const powerUpType = ['BLACK_HOLE', 'SPLIT', 'TIME_WARP'][
                Math.floor(Math.random() * 3)
            ];
            
            // Apply immediately
            // (would integrate with powerup-manager.js)
            spawnParticles(this.mesh.position.x, this.mesh.position.y, 0xffd700, 40);
            playSound('politician_gift');
            
        } else {
            // 1% Trojan horse: Lose all power-ups, paddle shrinks
            console.log('☠️ POLITICIAN BETRAYAL!');
            this.showDialogue("Fine print applies!");
            
            // Devastating consequences
            spawnParticles(this.mesh.position.x, this.mesh.position.y, 0xff0000, 50);
            playSound('politician_betrayal');
            
            // Would trigger power-up loss logic here
        }
        
        // Disappear after 3 seconds
        setTimeout(() => {
            this.despawn(scene);
        }, 3000);
    },
    
    despawn(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh = null;
        }
        this.active = false;
    }
};

/**
 * The Banker - Brick-eating mercenary
 */
export const theBanker = {
    spawnChance: 0.05, // 5%
    mesh: null,
    active: false,
    eatingRadius: 150,
    
    spawn(position, scene) {
        console.log('💰 The Banker has been summoned!');
        
        // Monopoly man parody
        const group = new THREE.Group();
        
        // Body (fat suit)
        const bodyGeo = new THREE.SphereGeometry(15, 12, 12);
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0x1a1a4e });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);
        
        // Head
        const headGeo = new THREE.SphereGeometry(8, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xffccaa });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 20;
        group.add(head);
        
        // Top hat
        const hatGeo = new THREE.CylinderGeometry(6, 6, 10, 8);
        const hatMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 28;
        group.add(hat);
        
        // Monocle
        const monocleGeo = new THREE.CircleGeometry(2, 8);
        const monocleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const monocle = new THREE.Mesh(monocleGeo, monocleMat);
        monocle.position.set(3, 22, 5);
        group.add(monocle);
        
        // Money bag
        const bagGeo = new THREE.SphereGeometry(10, 8, 8);
        const bagMat = new THREE.MeshBasicMaterial({ color: 0x228B22 });
        const bag = new THREE.Mesh(bagGeo, bagMat);
        bag.position.set(-12, 5, 0);
        group.add(bag);
        
        group.position.set(position.x, position.y, 0);
        scene.add(group);
        
        this.mesh = group;
        this.active = true;
        
        // Eating animation
        this.eatBricks(scene);
    },
    
    eatBricks(scene) {
        console.log('The Banker voraciously consumes bricks...');
        
        // Find all bricks within radius
        const bricksToEat = [];
        
        // Would access bricks array from entity-systems.js
        // This is pseudocode showing the logic
        if (gameState.bricks && gameState.bricks.items) {
            gameState.bricks.items.forEach(brick => {
                if (!this.mesh) return;
                
                const dx = brick.x - this.mesh.position.x;
                const dy = brick.y - this.mesh.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.eatingRadius && brick.hp > 0) {
                    bricksToEat.push(brick);
                }
            });
        }
        
        // Destroy bricks with eating animation
        bricksToEat.forEach((brick, index) => {
            setTimeout(() => {
                // Shrink animation
                const shrinkInterval = setInterval(() => {
                    if (brick.mesh) {
                        brick.mesh.scale.multiplyScalar(0.8);
                        
                        if (brick.mesh.scale.x < 0.1) {
                            clearInterval(shrinkInterval);
                            brick.hp = 0;
                            brick.mesh.visible = false;
                            
                            // Money particles
                            spawnParticles(brick.x, brick.y, 0x228B22, 10);
                            addScore(50, brick.x, brick.y);
                        }
                    }
                }, 50);
            }, index * 100);
        });
        
        // Explosion after eating (damages paddle area too)
        setTimeout(() => {
            this.explode(scene);
        }, bricksToEat.length * 100 + 1000);
    },
    
    explode(scene) {
        console.log('BOOM! The Banker explodes triumphantly!');
        
        spawnParticles(
            this.mesh.position.x,
            this.mesh.position.y,
            0xffd700,
            100
        );
        playSound('banker_explosion');
        
        // Screen shake
        // (would call game-loop.js triggerScreenShake())
        
        // Damage paddle area (1/5 of screen)
        // This is the risk/reward mechanic
        const damageZone = {
            x: this.mesh.position.x,
            y: this.mesh.position.y,
            radius: CONSTANTS.GAME_WIDTH / 5
        };
        
        console.log(`Paddle area damaged: ${damageZone.radius}px radius`);
        
        // Visual indicator of damaged zone
        const ringGeo = new THREE.RingGeometry(
            damageZone.radius - 10,
            damageZone.radius,
            32
        );
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(damageZone.x, damageZone.y, 0);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);
        
        // Fade out ring
        setTimeout(() => {
            scene.remove(ring);
        }, 2000);
        
        this.despawn(scene);
    },
    
    despawn(scene) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh = null;
        }
        this.active = false;
    }
};

/**
 * Check for special character spawns when brick destroyed
 */
export function checkSpecialCharacterSpawn(brick, scene) {
    const rand = Math.random();
    
    if (rand < thePolitician.spawnChance) {
        thePolitician.spawn(brick, scene);
        return true;
    }
    
    if (rand < thePolitician.spawnChance + theBanker.spawnChance) {
        theBanker.spawn(brick, scene);
        return true;
    }
    
    return false;
}
